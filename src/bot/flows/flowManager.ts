// src/bot/flows/flowManager.ts
// Modular, extensible flow/session manager for Telegram bot
// Follows project global rules

export interface BotFlow {
  start(userId: string | number, ...args: any[]): Promise<void>;
  handleMessage(userId: string | number, message: string): Promise<void>;
  end(userId: string | number): Promise<void>;
}

interface ActiveFlow {
  flow: BotFlow;
  state: any;
}

const activeFlows = new Map<string, ActiveFlow>();

export const FlowManager = {
  /**
   * Start a new flow for a user, ending any existing flow
   */
  async startFlow(userId: string | number, flow: BotFlow, ...args: any[]) {
    await FlowManager.endFlow(userId);
    activeFlows.set(String(userId), { flow, state: {} });
    await flow.start(userId, ...args);
  },

  /**
   * Handle a message for a user, delegating to their active flow if any
   */
  async handleMessage(userId: string | number, message: string): Promise<boolean> {
    const entry = activeFlows.get(String(userId));
    if (entry) {
      await entry.flow.handleMessage(userId, message);
      return true;
    }
    return false;
  },

  /**
   * End the active flow for a user
   */
  async endFlow(userId: string | number) {
    const entry = activeFlows.get(String(userId));
    if (entry) {
      await entry.flow.end(userId);
      activeFlows.delete(String(userId));
    }
  },

  /**
   * Check if a user is in a flow
   */
  isInFlow(userId: string | number): boolean {
    return activeFlows.has(String(userId));
  },

  /**
   * Get the current flow for a user (if any)
   */
  getFlow(userId: string | number): BotFlow | undefined {
    return activeFlows.get(String(userId))?.flow;
  },
}; 