import requests
from random import randint
import os


print()

for file in os.listdir('input'):
    response = requests.post(
        'https://api.remove.bg/v1.0/removebg',
        files={'image_file': open(f'input/{file}', 'rb')},
        data={'size': 'auto'},
        headers={'X-Api-Key': ''},
    )
    if response.status_code == requests.codes.ok:
        with open(f"output/{file}.png", 'wb') as out:
            out.write(response.content)
            print(file)
    else:
        print("Error:", response.status_code, response.text)