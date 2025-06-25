#!/bin/bash

# Test script for mcp-google-play

echo "Testing mcp-google-play installation..."

# Check if the command exists
if command -v mcp-google-play &> /dev/null; then
    echo "✓ mcp-google-play command found"
else
    echo "✗ mcp-google-play command not found"
    exit 1
fi

# Test with --help (should show error about missing API key)
echo "Testing command execution..."
mcp-google-play 2>&1 | grep -q "No API key provided" && echo "✓ Command executes correctly" || echo "✗ Command failed"

echo "Test complete!"
