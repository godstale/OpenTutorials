---
title: "Messaging Gateway"
type: source
ingest_mode: summary-only
content_type: spec
source_file: wiki/originals/hermes-messaging.md
created_at: 2026-06-14
author: 
team: 
tags: [hermes-agent, messaging, gateway, telegram, discord]
sources: []
last_updated: 2026-06-14
---

## Purpose
This document details how to configure and use Hermes Agent's Messaging Gateway to chat with the agent across various platforms like Telegram, Discord, Slack, and WhatsApp.

## Scope
It provides a platform capability comparison, describes the gateway architecture, and gives instructions on quick setup, chat commands, session management, and security policies.

## Structure
* Platform Comparison
* Architecture
* Quick Setup
* Gateway Commands
* Chat Commands (Inside Messaging)
* Session Management
* Security

## Key Values
* Connects a single Hermes Agent process to over 20 messaging platforms.
* By default, the gateway denies all users who are not in an explicit allowlist.
* Sessions persist across messages and can be configured to reset daily or after idle timeouts.
* Features rich chat commands (e.g., `/model`, `/voice`, `/background`) directly within the messaging UI.

## How to Use
Load the original file at `wiki/originals/hermes-messaging.md` for full data.
