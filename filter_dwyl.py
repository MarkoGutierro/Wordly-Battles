# Read all words from the source word list
with open("data/all_words.txt", "r", encoding="utf-8") as file:
    words = file.read().splitlines()

# Keep only clean five-letter words
five_letter_words = []

for word in words:
    word = word.strip()

    if len(word) == 5 and word.isascii() and word.isalpha():
        five_letter_words.append(word.upper())

# Write the filtered words to the valid-guesses file
with open("data/possible_guesses.txt", "w", encoding="utf-8") as file:
    for word in five_letter_words:
        file.write(word + "\n")

# Display how many five-letter words were found
print(f"Found {len(five_letter_words)} five-letter words.")