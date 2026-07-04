---
title: "Hermes Agent Quickstart"
type: source
ingest_mode: summary-only
content_type: spec
source_file: wiki/originals/hermes-quickstart.md
created_at: 2026-06-14
author: 
team: 
tags: [hermes-agent, quickstart, installation, setup]
sources: []
last_updated: 2026-06-14
---

## Purpose
This guide provides the shortest path for new users to install Hermes Agent, configure a provider, and successfully run their first chat.

## Scope
It covers installation via desktop installer or terminal, choosing a provider interactively, understanding how settings are stored, and verifying the setup with a first chat in the CLI or TUI.

## Structure
* Who this is for
* The fastest path
* 1. Install Hermes Agent
* 2. Choose a Provider
* 3. Run Your First Chat

## Key Values
* `hermes setup --portal` is the easiest path using Nous Portal.
* `hermes model` is used to interactively choose and configure LLM providers.
* Secrets go in `~/.hermes/.env` and non-secret config in `~/.hermes/config.yaml`.
* The minimum context window for models to work effectively with Hermes Agent is 64,000 tokens.

## How to Use
Load the original file at `wiki/originals/hermes-quickstart.md` for full data.
