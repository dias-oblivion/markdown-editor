#!/usr/bin/env bash
# Markdown Editor launcher — https://github.com/dias-oblivion/markdown-editor
# Source this file in your ~/.bashrc or ~/.zshrc

DOCKERHUB_IMAGE="obliviondias/markdown-editor"
IMAGE_TAG="latest"
MD_IMAGE="$DOCKERHUB_IMAGE:$IMAGE_TAG"

# Remove alias if it exists (zsh common-aliases plugin defines md='mkdir -p')
unalias md 2>/dev/null

md() {
    local workspace_dir

    if [ $# -ge 1 ]; then
        if [ -d "$1" ]; then
            workspace_dir="$(cd "$1" && pwd)"
        else
            echo "Error: '$1' is not a valid directory" >&2
            return 1
        fi
    else
        workspace_dir="$(pwd)"
    fi

    # Pull image if not present
    if ! docker image inspect "$MD_IMAGE" > /dev/null 2>&1; then
        echo "Image '$MD_IMAGE' not found locally. Pulling from Docker Hub..."
        docker pull "$MD_IMAGE"
    fi

    local os
    os="$(uname -s)"

    local docker_args=(
        --rm
        -v "$workspace_dir:/workspace"
        --ipc=host
        --security-opt seccomp=unconfined
        -e ELECTRON_IN_DOCKER=1
    )

    case "$os" in
        Linux)
            docker_args+=(
                -e "DISPLAY=${DISPLAY:-:0}"
                -v "/tmp/.X11-unix:/tmp/.X11-unix:rw"
            )
            xhost +local:docker 2>/dev/null || true
            ;;
        Darwin)
            if [ ! -d "/Applications/Utilities/XQuartz.app" ]; then
                echo "Error: XQuartz is required on macOS." >&2
                echo "Install with: brew install --cask xquartz" >&2
                echo "Then log out and back in, and enable 'Allow connections from network clients' in XQuartz preferences." >&2
                return 1
            fi
            xhost +localhost 2>/dev/null || true
            docker_args+=(
                -e "DISPLAY=host.docker.internal:0"
            )
            ;;
        *)
            echo "Error: Unsupported OS '$os'." >&2
            return 1
            ;;
    esac

    docker run "${docker_args[@]}" "$MD_IMAGE"
}

md-update() {
    echo "Updating Markdown Editor..."
    docker pull "$MD_IMAGE"
    echo "Done! Image updated to latest version."
}

md-stop() {
    local container_id
    container_id="$(docker ps -q --filter ancestor="$MD_IMAGE")"
    if [ -n "$container_id" ]; then
        docker stop "$container_id"
        echo "Markdown Editor stopped."
    else
        echo "No running Markdown Editor container found."
    fi
}
