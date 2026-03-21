"use client";

import React from 'react';
import { ChatBubble } from './chat-bubble';
import { ChatWindow } from './chat-window';

export function ChatContainer() {
    return (
        <>
            <ChatBubble />
            <ChatWindow />
        </>
    );
}
