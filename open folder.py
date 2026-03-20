import os

current_folder = os.getcwd()
print("Current folder:", current_folder)

files = os.listdir(current_folder)
print("Files in the current folder:")
for file in files:
    print(file)