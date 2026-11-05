HIJRAA PC Gateway
=================
Lets the clinic PC send WhatsApp messages (TCA reminders, blasts) from HIJRAA WELLNESS,
using the clinic's own WhatsApp number linked like WhatsApp Web.

1. Install Node.js (LTS) from https://nodejs.org (one time).
2. In HIJRAA WELLNESS: WhatsApp > Gateway > choose "PC" > Create PC token. Copy the token.
3. UNZIP FIRST: right-click the zip > Extract All. Then, in the extracted folder,
   double-click start.bat (Windows) or start.command (Mac). The first run installs itself and asks
   for the app address and the token.
4. Scan the QR code (shown in this window and in the app) with WhatsApp on the clinic phone:
   Settings > Linked devices > Link a device.
5. Keep this window open while you want messages to go out. If the PC is off, messages wait in
   the app's queue and go out when it is back.

Files: config.json (app address + token), whatsapp-session/ (the saved WhatsApp link: keep private).
To unlink: use "Disconnect phone" in the app, or delete the whatsapp-session folder.
