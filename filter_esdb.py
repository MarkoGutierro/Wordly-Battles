# Read the U.S. English Hunspell dictionary into a list of lines
with open("data/en_US.dic", "r", encoding="utf-8") as file:
    lines = file.read().splitlines()

# Create an empty set to store unique five-letter words
five_letter_words = set()

# Clean each dictionary entry and keep only valid five-letter words
for line in lines[1:]:  # Skip the first line, the word count
    word = line.split("\t")[0]   # Remove extra metadata
    word = word.split("/")[0]    # Remove Hunspell flags

    if len(word) == 5 and word.isascii() and word.isalpha():
        five_letter_words.add(word.upper())

# Sort the cleaned words alphabetically
five_letter_words = sorted(five_letter_words)

# Write the cleaned word list to a new text file
with open("data/scowl_five_letter_words.txt", "w", encoding="utf-8") as file:
    for word in five_letter_words:
        file.write(word + "\n")

# Display how many clean five-letter words were found
print(f"Found {len(five_letter_words)} clean five-letter words.")