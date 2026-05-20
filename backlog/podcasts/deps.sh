#!/bin/bash

wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2404/x86_64/cuda-keyring_1.1-1_all.deb

sudo dpkg -i cuda-keyring_1.1-1_all.deb

sudo apt update
sudo apt install -y ffmpeg cuda-toolkit libcublas12 libcudnn9-cuda-12 python3.12-dev python3.12-venv build-essential

echo 'export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH' >> ~/.bashrc
source ~/.bashrc
python3.12 -c "import ctranslate2; print(ctranslate2.get_cuda_device_count())"

curl https://sh.rustup.rs -sSf | sh

sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

python -m venv .venv-denoise
source .venv-denoise/bin/activate
pip install -r requirements-denoise.txt
deactivate

python -m venv .venv-whysper
source .venv-whysper/bin/activate
pip install -r requirements-whysper.txt
deactivate