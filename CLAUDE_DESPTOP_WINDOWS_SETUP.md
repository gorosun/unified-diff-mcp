## Claude Desktop Setup on Windows 11

### Enable WSL

Power Shell:
```sh
$ wsl --install -d Ubuntu-22.04
```

### Install NodeJS

WSL:
```sh
$ curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
```
```sh
$ sudo apt-get install -y nodejs build-essential
```
```sh
$ node -v
v22.16.0     # v22.x is OK
```

```sh
$ curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
$ exec $SHELL
```
```sh
$ nvm install 22
$ nvm use 22
$ nvm alias default 22
```

### Install Claude Code

WSL:
```sh
$ npm install -g @anthropic-ai/claude-code
```

```sh
$ claude --version
1.0.3 (Claude Code)
```

### Initial Setup of Claude Code

WSL:
```sh
$ claude
```

### Launch Claude Desktop on Host

Edit configuration file

1. Click hamburger menu at top left -> File -> Settings
2. Developer -> Claude Settings - Configure

Windows
```sh
C:\Users\username\AppData\Roaming\Claude\claude_desktop_config.json
```
