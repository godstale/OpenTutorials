---
title: "Open WebUI / API Server"
type: source
ingest_mode: summary-only
content_type: spec
source_file: wiki/originals/hermes-api-server.md
created_at: 2026-06-14
author: 
team: 
tags: [hermes-agent, open-webui, api-server, architecture]
sources: []
last_updated: 2026-06-14
---

## Purpose
This document provides instructions on how to use Open WebUI with Hermes Agent's built-in API server, allowing users to interact with their agent via a modern web frontend.

## Scope
It covers the architecture of the connection, quick setup instructions using a local bootstrap script or Docker, configuration via the Admin UI, and details on API modes (Chat Completions vs. Responses).

## Structure
* Architecture overview
* Quick Setup (One-command local bootstrap)
* Docker Compose Setup
* Configuring via the Admin UI
* API Type: Chat Completions vs Responses

## Key Values
* Open WebUI connects to the Hermes gateway API server (port 8642) acting as an OpenAI-compatible backend.
* The API server is a full agent runtime, not just an LLM proxy.
* Tools run on the host where the API server is running, not necessarily where the UI is accessed.

## How to Use
Load the original file at `wiki/originals/hermes-api-server.md` for full data.
