import { findByProps } from "@vendetta/metro";
import { logger } from "@vendetta/debug";
import { registerCommand } from "@vendetta/commands";
import { storage } from "@vendetta/plugin";

// 1. Find Discord's internal Typing Module
// This module contains the 'startTyping' function used by the official client
const TypingModule = findByProps("startTyping", "stopTyping");

// 2. State management
let typingInterval;
let isFakeTyping = false;

// Helper to stop typing safely
function stopFakeTyping() {
    if (typingInterval) {
        clearInterval(typingInterval);
        typingInterval = null;
    }
    isFakeTyping = false;
}

// Helper to start typing loop
function startFakeTyping(channelId) {
    // Stop any existing loop first
    stopFakeTyping();
    isFakeTyping = true;

    // Trigger immediately
    TypingModule.startTyping(channelId);

    // Discord typing status expires after ~10 seconds.
    // We set an interval to refresh it every 9 seconds.
    typingInterval = setInterval(() => {
        // Double check we are still toggled on
        if (!isFakeTyping) {
            stopFakeTyping();
            return;
        }
        TypingModule.startTyping(channelId);
    }, 9000);
}

export default {
    onLoad: () => {
        logger.log("FakeTyper loaded!");

        // 3. Register the slash command
        this.unloadCommand = registerCommand({
            name: "faketype",
            displayName: "Fake Typer",
            description: "Toggles fake typing status in the current channel.",
            displayDescription: "Toggles fake typing status in the current channel.",
            options: [],
            // The function to execute when command is run
            execute: (args, ctx) => {
                const channelId = ctx.channel.id;

                if (isFakeTyping) {
                    stopFakeTyping();
                    return { content: "Stopped fake typing.", private: true };
                } else {
                    startFakeTyping(channelId);
                    return { content: "Started fake typing! (Run again to stop)", private: true };
                }
            },
            // ApplicationCommandType.CHAT
            type: 1, 
            inputType: 1,
            applicationId: "-1"
        });
    },

    onUnload: () => {
        // Cleanup: Stop typing and unregister commands
        stopFakeTyping();
        if (this.unloadCommand) this.unloadCommand();
        logger.log("FakeTyper unloaded!");
    }
};
