#!/bin/bash

# Script para fazer push dos commits para o GitHub
# Uso: ./push-changes.sh [opção]

set -e

BRANCH="claude/logo-detection-replacement-4t4jpl"
REPO="willsantos95/video-api"

echo "🚀 Script de Push - Video API"
echo "================================"
echo ""
echo "Branch: $BRANCH"
echo "Repositório: $REPO"
echo ""

# Verificar commits não pushed
UNPUSHED=$(git rev-list @{u}..HEAD 2>/dev/null | wc -l)
if [ "$UNPUSHED" -eq 0 ]; then
    echo "✅ Tudo já está sincronizado com o remote!"
    exit 0
fi

echo "📊 Commits a fazer push: $UNPUSHED"
echo ""
git log --oneline -$UNPUSHED
echo ""

# Menu de opções
echo "Escolha um método de autenticação:"
echo "1) GitHub CLI (recomendado)"
echo "2) Personal Access Token"
echo "3) SSH"
echo "4) Apenas verificar status"
echo ""

if [ -z "$1" ]; then
    read -p "Opção (1-4): " OPTION
else
    OPTION=$1
fi

case $OPTION in
    1)
        echo ""
        echo "🔐 Usando GitHub CLI..."

        if ! command -v gh &> /dev/null; then
            echo "❌ GitHub CLI não está instalado!"
            echo ""
            echo "Instale com:"
            echo "  macOS: brew install gh"
            echo "  Linux: apt install gh"
            echo "  Windows: choco install gh"
            exit 1
        fi

        # Verificar se está autenticado
        if ! gh auth status &> /dev/null; then
            echo "⚠️  Você não está autenticado. Executando: gh auth login"
            gh auth login
        fi

        echo "📤 Fazendo push..."
        git push -u origin $BRANCH
        echo ""
        echo "✅ Push concluído com sucesso!"
        echo "🔗 Acesse: https://github.com/$REPO/tree/$BRANCH"
        ;;

    2)
        echo ""
        echo "🔐 Usando Personal Access Token..."
        echo ""
        echo "1️⃣  Gere um token em: https://github.com/settings/tokens/new"
        echo "2️⃣  Escopo necessário: repo"
        echo "3️⃣  Cole o token abaixo (será mascarado)"
        echo ""

        read -sp "Token: " TOKEN
        echo ""

        if [ -z "$TOKEN" ]; then
            echo "❌ Token não fornecido!"
            exit 1
        fi

        echo "📤 Configurando credenciais..."
        git remote set-url origin "https://x-access-token:${TOKEN}@github.com/$REPO.git"

        echo "📤 Fazendo push..."
        git push -u origin $BRANCH

        echo ""
        echo "✅ Push concluído com sucesso!"
        echo "🔗 Acesse: https://github.com/$REPO/tree/$BRANCH"

        # Restaurar URL original
        git remote set-url origin "https://github.com/$REPO.git"
        ;;

    3)
        echo ""
        echo "🔐 Usando SSH..."

        # Verificar se tem chave SSH
        if [ ! -f ~/.ssh/id_ed25519 ] && [ ! -f ~/.ssh/id_rsa ]; then
            echo "⚠️  Nenhuma chave SSH encontrada!"
            echo ""
            echo "Gere com: ssh-keygen -t ed25519 -C 'seu-email@example.com'"
            echo "Adicione em: https://github.com/settings/ssh/new"
            exit 1
        fi

        echo "📤 Configurando SSH..."
        git remote set-url origin "git@github.com:$REPO.git"

        echo "📤 Fazendo push..."
        git push -u origin $BRANCH

        echo ""
        echo "✅ Push concluído com sucesso!"
        echo "🔗 Acesse: https://github.com/$REPO/tree/$BRANCH"
        ;;

    4)
        echo ""
        echo "📊 Status atual:"
        git status
        echo ""
        echo "📋 Commits não pushed:"
        git log --oneline @{u}..HEAD 2>/dev/null || echo "Nenhum commit"
        ;;

    *)
        echo "❌ Opção inválida!"
        exit 1
        ;;
esac
