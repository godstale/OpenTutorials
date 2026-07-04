---
title: "Hermes Agent Architecture"
type: source
ingest_mode: summary-only
content_type: spec
source_file: wiki/originals/hermes-architecture.md
created_at: 2026-06-14
author: 
team: 
tags: [hermes-agent, architecture, developer-guide]
sources: []
last_updated: 2026-06-14
---

## Purpose
This document serves as the top-level developer map of Hermes Agent's internals, helping developers orient themselves within the codebase.

## Scope
It outlines the system overview, detailed directory structure, data flow across different invocation methods (CLI, Gateway, Cron), and lists major subsystems.

## Structure
* System Overview
* Directory Structure
* Data Flow (CLI Session, Gateway Message, Cron Job)
* Recommended Reading Order
* Major Subsystems (Agent Loop, Prompt System)

## Key Values
* The core conversational loop is handled by `AIAgent` in `run_agent.py`.
* Supports over 70 tools and 28 toolsets.
* Features multiple entry points including CLI, Gateway, ACP, and API Server.
* Session storage is backed by SQLite with FTS5.

## How to Use
Load the original file at `wiki/originals/hermes-architecture.md` for full data.
