#!/bin/bash
# Script substituto para o gradlew quebrado
# Baixa e roda o Gradle automaticamente

GRADLE_VERSION=7.5
GRADLE_DIST=gradle-${GRADLE_VERSION}-bin.zip
GRADLE_URL=https://services.gradle.org/distributions/${GRADLE_DIST}
# Instala o binário em /tmp para garantir permissões de execução (evita problemas com mounts do Windows)
INSTALL_DIR=/tmp/gradle_install
# Define o HOME do Gradle também para /tmp para evitar erro de 'native-platform' em mounts do Windows
export GRADLE_USER_HOME=/tmp/gradle_home

# --- FIX JAVA_HOME ---
if [ ! -d "$JAVA_HOME" ] || [ -z "$JAVA_HOME" ]; then
    echo "JAVA_HOME ($JAVA_HOME) parece inválido ou vazio. Tentando detectar..."
    if command -v java >/dev/null 2>&1; then
        JAVA_BIN=$(readlink -f $(which java))
        export JAVA_HOME=$(dirname $(dirname "$JAVA_BIN"))
        echo "Novo JAVA_HOME detectado: $JAVA_HOME"
    else
        echo "ERRO: Java não encontrado no PATH."
    fi
fi
# ---------------------

echo "--- Verificando Gradle $GRADLE_VERSION ---"
echo "Usando GRADLE_USER_HOME=$GRADLE_USER_HOME"

if [ ! -f "$INSTALL_DIR/gradle-$GRADLE_VERSION/bin/gradle" ]; then
    echo "Gradle não encontrado. Baixando..."
    mkdir -p $INSTALL_DIR
    
    if command -v wget >/dev/null 2>&1; then
        wget -q $GRADLE_URL -O /tmp/$GRADLE_DIST
    else
        curl -L $GRADLE_URL -o /tmp/$GRADLE_DIST
    fi
    
    echo "Extraindo..."
    unzip -q /tmp/$GRADLE_DIST -d $INSTALL_DIR
    rm /tmp/$GRADLE_DIST
    echo "Gradle instalado em $INSTALL_DIR"
else
    echo "Gradle já instalado."
fi

# Executa o gradle
echo "Executando build..."
# Adiciona --no-daemon por padrão para evitar problemas de memória/travamento no Docker
exec "$INSTALL_DIR/gradle-$GRADLE_VERSION/bin/gradle" --no-daemon "$@"