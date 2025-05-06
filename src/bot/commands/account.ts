// src/bot/commands/account.ts
// Account flow for Telegram bot

import { sendTelegramMessage } from '../../integrations/telegram';
import { getUserByTelegramId, getAlertsByUserId, isUserSubscriptionActive } from '../../integrations/supabase';
import { mainMenuKeyboard } from '../menu';

/**
 * Show the user's current credit balance and purchase instructions
 */
export async function showAccount(telegramId: number | string) {
  const user = await getUserByTelegramId(String(telegramId));
  if (!user) {
    await sendTelegramMessage({
      chat_id: telegramId,
      text: 'Account not found. Please use /start to register your account and access premium alerts.',
    });
    return;
  }
  const alerts = await getAlertsByUserId(user.id, true);
  // Only count telegram alerts towards the cap
  const telegramAlerts = alerts.filter(a => a.delivery_type === 'telegram');
  const activeAlerts = telegramAlerts.length;
  const subActive = user.subscription_status === 'active' && user.subscription_end && new Date(user.subscription_end) > new Date();
  let subStatus = subActive ? 'Active' : 'Inactive';
  let subDetail = '';
  if (subActive && user.subscription_end) {
    const now = new Date();
    const end = new Date(user.subscription_end);
    const diffMs = end.getTime() - now.getTime();
    const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    subStatus = `Active - ${diffDays} day${diffDays === 1 ? '' : 's'} remaining`;
  }
  const isPremium = user.credits > 0 || (user.subscription_status === 'active' && user.subscription_end && new Date(user.subscription_end) > new Date());
  const alertCapDisplay = isPremium ? 'Unlimited' : user.max_active_alerts;
  const creditsDisplay = subActive ? 'Unlimited' : user.credits;
  const appreciationMsg = '<i>Thank you for supporting Forex Ring Alerts. We are committed to providing you with the fastest, most reliable price alert service available.</i>';
  const upsellMsg = '<i>Add credits to unlock instant voice call alerts and unlimited active alerts.</i>';
  const contactMsg = '\n\nNeed help or have a suggestion? I\'m always happy to chat—just message <a href="https://t.me/abribooysen">@abribooysen</a>.';
  await sendTelegramMessage({
    chat_id: telegramId,
    text:
      `<b>Account Overview</b>\n\n` +
      `<b>Telegram Alerts:</b> Free\n` +
      `<b>Voice Call Alerts:</b> ${isPremium ? 'Enabled' : 'Disabled'}\n` +
      `<b>Credits:</b> ${creditsDisplay}\n` +
      `<b>Active Alerts:</b> ${activeAlerts} / ${alertCapDisplay}\n` +
      `\n` +
      `<b>User ID:</b> ${user.telegram_id}\n\n` +
      (isPremium ? appreciationMsg : upsellMsg) + contactMsg,
    parse_mode: 'HTML',
    reply_markup: mainMenuKeyboard,
  });
} 