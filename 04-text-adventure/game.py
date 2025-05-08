import time
import os
from typing import Dict, List, Optional
import json

class GameState:
    def __init__(self):
        self.inventory: List[str] = []
        self.flags: Dict[str, bool] = {}
        self.current_scene: str = "start"
        self.visited_scenes: set = set()
        self.language: str = "en"

class TextAdventure:
    def __init__(self):
        self.state = GameState()
        self.stories = {
            "en": self._load_story("story.json"),
            "bg": self._load_story("story_bg.json")
        }
        
    def _load_story(self, filename: str) -> dict:
        with open(filename, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def clear_screen(self):
        os.system('cls' if os.name == 'nt' else 'clear')
    
    def print_slowly(self, text: str, delay: float = 0.03):
        for char in text:
            print(char, end='', flush=True)
            time.sleep(delay)
        print()
    
    def display_scene(self, scene_id: str):
        scene = self.stories[self.state.language]['scenes'][scene_id]
        self.clear_screen()
        
        # Print scene title
        print("\n" + "="*50)
        print(f" {scene['title']} ".center(50, "="))
        print("="*50 + "\n")
        
        # Print scene description
        self.print_slowly(scene['description'])
        print()
        
        # Print available choices
        print("\nWhat will you do?" if self.state.language == "en" else "\nКакво ще направите?")
        for i, choice in enumerate(scene['choices'], 1):
            print(f"{i}. {choice['text']}")
        
        # Handle scene-specific logic
        if 'on_enter' in scene:
            for action in scene['on_enter']:
                self._handle_action(action)
    
    def _handle_action(self, action: dict):
        action_type = action['type']
        if action_type == 'add_item':
            if action['item'] not in self.state.inventory:
                self.state.inventory.append(action['item'])
                self.print_slowly(f"\nYou acquired: {action['item']}" if self.state.language == "en" else f"\nПридобихте: {action['item']}")
        elif action_type == 'set_flag':
            self.state.flags[action['flag']] = True
        elif action_type == 'remove_item':
            if action['item'] in self.state.inventory:
                self.state.inventory.remove(action['item'])
    
    def get_choice(self, max_choices: int) -> int:
        while True:
            try:
                choice = int(input("\nEnter your choice (number): " if self.state.language == "en" else "\nВъведете избора си (номер): "))
                if 1 <= choice <= max_choices:
                    return choice
                print("Invalid choice. Please try again." if self.state.language == "en" else "Невалиден избор. Моля, опитайте отново.")
            except ValueError:
                print("Please enter a number." if self.state.language == "en" else "Моля, въведете число.")
    
    def check_conditions(self, conditions: List[dict]) -> bool:
        if not conditions:
            return True
            
        for condition in conditions:
            condition_type = condition['type']
            if condition_type == 'has_item':
                if condition['item'] not in self.state.inventory:
                    return False
            elif condition_type == 'has_flag':
                if not self.state.flags.get(condition['flag'], False):
                    return False
        return True
    
    def select_language(self):
        self.clear_screen()
        print("\n" + "="*50)
        print(" Select Language / Изберете език ".center(50, "="))
        print("="*50 + "\n")
        print("1. English")
        print("2. Български")
        
        while True:
            try:
                choice = int(input("\nEnter your choice (1-2): "))
                if choice == 1:
                    self.state.language = "en"
                    break
                elif choice == 2:
                    self.state.language = "bg"
                    break
                print("Invalid choice. Please try again.")
            except ValueError:
                print("Please enter a number.")
    
    def play(self):
        self.select_language()
        
        while True:
            scene = self.stories[self.state.language]['scenes'][self.state.current_scene]
            self.state.visited_scenes.add(self.state.current_scene)
            
            self.display_scene(self.state.current_scene)
            
            # Filter available choices based on conditions
            available_choices = [
                choice for choice in scene['choices']
                if self.check_conditions(choice.get('conditions', []))
            ]
            
            if not available_choices:
                print("\nYou have no available choices. The story ends here." if self.state.language == "en" else "\nНямате налични избори. Историята свършва тук.")
                break
                
            choice = self.get_choice(len(available_choices))
            selected_choice = available_choices[choice - 1]
            
            # Handle choice-specific actions
            if 'actions' in selected_choice:
                for action in selected_choice['actions']:
                    self._handle_action(action)
            
            # Move to next scene
            self.state.current_scene = selected_choice['next_scene']
            
            # Check if we've reached an ending
            if self.state.current_scene.startswith('ending_'):
                self.display_scene(self.state.current_scene)
                break

if __name__ == "__main__":
    game = TextAdventure()
    game.play() 