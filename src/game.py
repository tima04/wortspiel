import random
from pathlib import Path

import pandas as pd


class Game():
    
    def __init__(self, max_words=6, n = 1):
        data_path = Path(__file__).resolve().parent.parent / "data" / "deu_eng_table.csv.gz"
        df = pd.read_csv(data_path, compression="gzip")
        self.rows = df.query(f'nwords <= {max_words}').sample(n, replace=False)
 
    def __call__(self, *args, **kwds):
        for row in self.rows.itertuples(index=False):
            jumble = Jumble(row.deu, row.eng)
            while not jumble.end:
                print(jumble.jumble)
                response = input("Deutsch (or 'hint [n]'/'translation'): ").strip()
                command = response.split()
                if command and command[0].lower() == "hint":
                    try:
                        n = int(command[1]) if len(command) == 2 else 1
                        if n < 1 or len(command) > 2:
                            raise ValueError
                    except ValueError:
                        print("Use 'hint' or 'hint n' with a positive number of words.")
                    else:
                        print("Hint:", " ".join(jumble.hint(n)))
                    continue
                if response.lower() in ("translate", "translation"):
                    print("Eng:", jumble.translate())
                    continue
                print(jumble.answer(response))


class Jumble:
    def __init__(self, deu: str, eng: str):
        self.deu = deu 
        self.eng = eng
        self.jumble = self.jumble_sentence(deu)
        self.end = False

    def jumble_sentence(self, sentence: str) -> str:
        """Return the sentence with its words in a random order.

        The result is guaranteed to differ from the input when that is possible
        (i.e. when the sentence has at least two distinct words).
        """
        words = sentence.split()
        if len(set(words)) < 2:
            return sentence

        jumbled = words[:]
        while jumbled == words:
            random.shuffle(jumbled)
        return " ".join(jumbled)

    def answer(self, ans):
        result = 'Richtig' if ans == self.deu else 'Falsch'
        if result == 'Richtig':
            print("Eng:", self.eng)
            self.end = True
        return result

    def translate(self):
        return self.eng

    def hint(self, n=1):
        return self.deu.split()[0:n]
