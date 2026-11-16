# Load bad words into a set for fast lookup
with open("data/bad_words.txt", "r", encoding="utf-8") as file:
    bad_words = {
        word.strip().upper()
        for word in file
        if word.strip()
    }

# Load custom words
with open("data/custom_five_letter_words.txt", "r", encoding="utf-8") as file:
    custom_words = [
        word.strip().upper()
        for word in file
        if word.strip()
    ]

# Remove bad words
clean_words = [
    word
    for word in custom_words
    if word not in bad_words
]

# Rewrite custom file
with open("data/custom_five_letter_words.txt", "w", encoding="utf-8") as file:
    for word in clean_words:
        file.write(word + "\n")

# Display how many words started in the list, were removed, and remain
print(f"Original custom words: {len(custom_words)}")
print(f"Removed bad words: {len(custom_words) - len(clean_words)}")
print(f"Remaining words: {len(clean_words)}")