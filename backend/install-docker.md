# Instalación de Docker Engine (Ubuntu)

## 1. Instalar dependencias

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
```

## 2. Agregar la clave GPG de Docker

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

## 3. Agregar el repositorio

```bash
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

## 4. Instalar Docker

```bash
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## 5. Agregar tu usuario al grupo docker

Para no necesitar `sudo` cada vez:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

## 6. Verificar instalación

```bash
docker --version
docker compose version
```
