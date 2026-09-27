# PromptPay Auto Approve

Auto approval is OFF by default. Uploaded slips alone never grant credit. The
existing Telegram replies `1` (approve) and `2` (reject), LINE confirmation,
and admin top-up completion remain available.

## Prerequisites

1. Enable the existing PromptPay Telegram bot and its admin group. The bot
   checks Telegram's current group administrator status for every settings
   command, just as it does for manual approval replies `1` and `2`. If that
   check fails, no settings are changed. `/auto_id` shows the sender's Telegram
   ID for troubleshooting; it is different from a TinyToken user ID.
2. Configure a SlipOK API branch with the actual receiving bank account bound
   in SlipOK. Select `slipok` as the PromptPay slip provider in payment settings,
   set its API URL to `https://api.slipok.com/api/line/apikey/BRANCH_ID`, and set
   the API key there. Do not put the API key in Telegram or this document.
3. In the configured PromptPay Telegram group, an administrator runs:

   ```text
   /auto_timezone Asia/Bangkok
   /auto_time 23:00 08:00
   /auto_user add 41
   /auto_max 100
   /auto_status
   /auto on
   ```

`/auto off` disables new auto approvals immediately after the command commits.
`/auto_user remove 41` removes a user; `/auto_user list` shows the allowlist.
Start time is inclusive, end time is exclusive, including windows crossing
midnight. The timezone is an explicit IANA name stored with the rules in the
existing `options` table. A missing or invalid timezone prevents approval.

Only eligible pending PromptPay orders are checked with SlipOK. Requests send
`log=true` and the expected amount so SlipOK checks its bound recipient and
duplicate slips. The application also checks the response, amount, bank
reference, country, recipient fields, and payment time before using the shared
approval transaction. A unique bank reference and atomic pending-to-success
update prevent duplicate credit. Failed verification, unsupported slip formats,
provider outages, or database errors leave the order pending for manual review.

The new `top_up_approvals` audit table records the approval method (`AUTO` or
`MANUAL`), Telegram admin ID for manual Telegram approvals, timestamp, amounts,
and a unique bank reference for automatic approvals. It does not alter the busy
`top_ups` table. The existing top-up log records
the order ID, user ID, amount, credits, and method. Auto approval sends a
separate Telegram confirmation; no bot token or API key is logged.

This feature requires an active SlipOK subscription and configured recipient.
No verification provider is configured by default. Do not enable it until the
recipient binding and live SlipOK response have been tested with a low-value
payment. The current implementation does not auto approve `manual`, `slipmate`,
or `custom` providers.
