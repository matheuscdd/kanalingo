#!/bin/bash

wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2404/x86_64/cuda-keyring_1.1-1_all.deb

sudo dpkg -i cuda-keyring_1.1-1_all.deb

sudo apt update
sudo apt install -y ffmpeg cuda-toolkit libcublas12 libcudnn9-cuda-12

echo 'export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH' >> ~/.bashrc
source ~/.bashrc
python -c "import ctranslate2; print(ctranslate2.get_cuda_device_count())"

if grep -qi microsoft /proc/version 2>/dev/null; then
    read -p "Essa é uma técnica para reduzir a tempera da GPU, depois será preciso voltar manualmente para o ponto desejado. Recomendamos que faça essa alteração no cmd como administrador. Está ciente? (y/N): " resp
    exit 1
fi

sudo nvidia-smi -pl 260