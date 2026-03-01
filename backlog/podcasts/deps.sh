#!/bin/bash

wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2404/x86_64/cuda-keyring_1.1-1_all.deb

sudo dpkg -i cuda-keyring_1.1-1_all.deb

sudo apt update
sudo apt install -y ffmpeg cuda-toolkit libcublas12 libcudnn9-cuda-12

echo 'export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH' >> ~/.bashrc
source ~/.bashrc
python -c "import ctranslate2; print(ctranslate2.get_cuda_device_count())"
