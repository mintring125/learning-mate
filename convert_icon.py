from PIL import Image
import sys
import os

try:
    img = Image.open('resources/icon.jpg')
    img.save('resources/icon.png')
    print("Converted successfully")
    os.remove('resources/icon.jpg')
except Exception as e:
    print(f"Error: {e}")
