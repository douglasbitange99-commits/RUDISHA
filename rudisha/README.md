# Rudisha on MongoDB Atlas + Render (free)

The app is a small Node server plus the web app. The server talks to your MongoDB Atlas
database and enforces every privacy rule. The browser never touches the database.
MongoDB's old browser-friendly "Data API" has been shut down, which is why a server is needed.

## Keep your secrets secret
- Your database **password** and the **connection string** go only into Render's Environment
  settings. Never put them in these files, in GitHub, or in a chat.
- If a password was ever shared anywhere, change it in Atlas > Database Access > Edit.

## Step 1: Atlas (you already have the cluster and user)
1. **Database Access**: your user needs permission to read and write (the "Read and write to any database" role is fine). Use a long password (20+ characters, letters and numbers).
2. **Network Access > Add IP address > Allow access from anywhere** (`0.0.0.0/0`). Render's free plan has no fixed address, so this is needed. The long password and the app's own checks are what protect you.
3. **Database > Connect > Drivers**: copy the connection string. It looks like
   `mongodb+srv://USERNAME:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`.
   Replace `<password>` with the real password. If the password has symbols such as `@ : / ?`, change them to their `%` codes or simply choose a password with only letters and numbers.

## Step 2: Put this folder on GitHub (free)
1. Create an account at github.com and click **New repository** (name it `rudisha`, private is fine).
2. Click **uploading an existing file** and drag in everything from this folder (the `public` folder too). Commit.

## Step 3: Deploy on Render (free)
1. Sign up at render.com with your GitHub account.
2. **New > Web Service**, pick your `rudisha` repository.
3. Settings: Runtime **Node**, Build command `npm install`, Start command `npm start`, Instance type **Free**.
   (Or choose **New > Blueprint** and Render reads `render.yaml` for you.)
4. **Environment** tab, add:
   - `MONGODB_URI` = your connection string from Step 1
   - `JWT_SECRET` = any long random text, 30+ characters (skip if you used the Blueprint)
   - `NODE_ENV` = `production`
5. Deploy. After a few minutes you get a link like `https://rudisha.onrender.com`. Open it.
   If the logs say "Could not start", the connection string or Atlas network access is wrong.

## Step 4: Make yourself admin
1. In the live app, **Create account** with your name, phone and a 6-digit PIN.
2. In Atlas: **Browse Collections > rudisha > users**, open your document, change `role` from `"user"` to `"admin"`, and update.
3. Log out and in again. The **Admin** tab appears. Only the server decides this, never the browser.
4. Payment instructions that owners see: Atlas > `rudisha` > `settings` > the document with `_id: "pay_info"`, edit `value`, for example `Pay to Till 123456 (Rudisha)`. The fee and finder share are the `fee` and `finder_pct` documents. New claims use the fee at the time of the claim.

## How a recovery works
1. Finder lists the item. Admin calls them, arranges the drop-off at a Rudisha agent or office, taps **Item received**.
2. Owner searches, taps **This is mine**, gives proof and where the item should reach them.
3. Admin compares proof with the finder's private details and taps **Proof matches**.
4. Admin sets transport if the item was found outside town (arranged with the finder) and taps **Ask owner to pay**.
5. Owner pays by M-Pesa to your till and enters the confirmation code. Admin checks the M-Pesa message, taps **Payment received**, hands the item over, taps **Item delivered**.
6. Admin pays the finder their 40% and taps **Finder paid**.
The server refuses steps out of order, for example asking for payment before the item is at Rudisha.

## Who can see what
- Search shows only category, general description, place and date. Never the finder, private details or any contact.
- Finders see their own items; owners their own claims and reports. Nobody sees another person's contact.
- Only the admin sees names, phone numbers, private details and proof. Counts and money totals are admin-only.
- PINs are stored scrambled (bcrypt). Five wrong PINs lock that account for 15 minutes.

## Free plan realities (please read)
- Render's free service **goes to sleep after 15 minutes without visitors**. The first visit afterwards takes 30 to 60 seconds, and the app shows a "waking the server" message. Render's own docs say free instances are not for production. When real customers arrive, move to a paid Render instance (no sleeping) or the Supabase version I gave you earlier.
- Atlas's free cluster is small (about 0.5 GB): fine for text reports.
- Not included because they cost money or need approvals: SMS verification codes, automatic M-Pesa collection (Daraja), item photos.

## Before you launch publicly
- You store names, phone numbers and ID details. Check Kenya's Data Protection Act and whether you must register with the Office of the Data Protection Commissioner. Add a short privacy notice.
- Test the full journey with two phones and a made-up item first.

## If something goes wrong
- **Page says "Waking the server up"**: normal after a quiet spell; wait a minute.
- **"Could not start" in Render logs**: check `MONGODB_URI`, the password, and Atlas Network Access.
- **No Admin tab**: the `role` field in your `users` document is not exactly `admin`, or you did not log out and in.
- **"Too many attempts"**: wait 15 minutes.
