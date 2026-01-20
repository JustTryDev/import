#!/usr/bin/env python3
"""
MCP Server Setup Script
Configures MCP servers (Context7, Playwright) for Claude Code projects.
"""

import argparse
import json
import sys
from pathlib import Path

# Default MCP server configurations
DEFAULT_MCP_SERVERS = {
    "context7": {
        "command": "npx",
        "args": ["-y", "@upstash/context7-mcp@latest"]
    },
    "playwright": {
        "command": "npx",
        "args": ["-y", "@playwright/mcp@latest"]
    }
}

# Optional MCP servers that can be added
OPTIONAL_MCP_SERVERS = {
    "github": {
        "command": "npx",
        "args": ["-y", "@anthropic/github-mcp@latest"],
        "env": {
            "GITHUB_TOKEN": "${GITHUB_TOKEN}"
        }
    },
    "postgres": {
        "command": "npx",
        "args": ["-y", "@anthropic/postgres-mcp@latest"],
        "env": {
            "DATABASE_URL": "${DATABASE_URL}"
        }
    },
    "filesystem": {
        "command": "npx",
        "args": ["-y", "@anthropic/filesystem-mcp@latest", "--root", "."]
    }
}


def load_existing_settings(settings_path: Path) -> dict:
    """Load existing settings.json if it exists."""
    if settings_path.exists():
        try:
            with open(settings_path, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError:
            print(f"  Warning: Could not parse existing {settings_path}, creating new one")
    return {}


def merge_mcp_servers(existing: dict, new_servers: dict) -> dict:
    """Merge new MCP servers with existing ones, preserving user customizations."""
    existing_mcp = existing.get("mcpServers", {})

    for server_name, server_config in new_servers.items():
        if server_name not in existing_mcp:
            existing_mcp[server_name] = server_config
            print(f"  Added: {server_name}")
        else:
            print(f"  Skipped (already exists): {server_name}")

    existing["mcpServers"] = existing_mcp
    return existing


def setup_mcp(project_path: Path, servers: list[str] = None, include_optional: list[str] = None):
    """Set up MCP servers for the project."""
    claude_dir = project_path / ".claude"
    settings_path = claude_dir / "settings.json"

    print(f"\n{'='*50}")
    print("Setting up MCP servers")
    print(f"Path: {project_path}")
    print(f"{'='*50}\n")

    # Create .claude directory if it doesn't exist
    claude_dir.mkdir(parents=True, exist_ok=True)

    # Determine which servers to configure
    servers_to_add = {}

    if servers:
        # User specified specific servers
        for server in servers:
            if server in DEFAULT_MCP_SERVERS:
                servers_to_add[server] = DEFAULT_MCP_SERVERS[server]
            elif server in OPTIONAL_MCP_SERVERS:
                servers_to_add[server] = OPTIONAL_MCP_SERVERS[server]
            else:
                print(f"  Warning: Unknown server '{server}', skipping")
    else:
        # Use default servers
        servers_to_add = DEFAULT_MCP_SERVERS.copy()

    # Add optional servers if requested
    if include_optional:
        for server in include_optional:
            if server in OPTIONAL_MCP_SERVERS:
                servers_to_add[server] = OPTIONAL_MCP_SERVERS[server]
            else:
                print(f"  Warning: Unknown optional server '{server}', skipping")

    # Load existing settings and merge
    existing_settings = load_existing_settings(settings_path)
    updated_settings = merge_mcp_servers(existing_settings, servers_to_add)

    # Write settings
    with open(settings_path, 'w') as f:
        json.dump(updated_settings, f, indent=2)

    print(f"\n{'='*50}")
    print(f"MCP setup complete!")
    print(f"Settings saved to: {settings_path}")
    print(f"{'='*50}\n")

    # Print configured servers
    print("Configured MCP servers:")
    for server_name in updated_settings.get("mcpServers", {}).keys():
        print(f"  - {server_name}")


def list_servers():
    """List all available MCP servers."""
    print("\nDefault MCP servers (always included):")
    for name, config in DEFAULT_MCP_SERVERS.items():
        cmd = " ".join([config["command"]] + config["args"])
        print(f"  - {name}: {cmd}")

    print("\nOptional MCP servers (use --include):")
    for name, config in OPTIONAL_MCP_SERVERS.items():
        cmd = " ".join([config["command"]] + config["args"])
        env_note = ""
        if "env" in config:
            env_vars = ", ".join(config["env"].keys())
            env_note = f" (requires: {env_vars})"
        print(f"  - {name}: {cmd}{env_note}")


def main():
    parser = argparse.ArgumentParser(description="Set up MCP servers for Claude Code")
    parser.add_argument(
        "--path", "-p",
        default=".",
        help="Project path (default: current directory)"
    )
    parser.add_argument(
        "--servers", "-s",
        nargs="+",
        help="Specific servers to configure (default: context7, playwright)"
    )
    parser.add_argument(
        "--include", "-i",
        nargs="+",
        help="Include optional servers (github, postgres, filesystem)"
    )
    parser.add_argument(
        "--list", "-l",
        action="store_true",
        help="List all available MCP servers"
    )

    args = parser.parse_args()

    if args.list:
        list_servers()
        return

    setup_mcp(Path(args.path), args.servers, args.include)


if __name__ == "__main__":
    main()
