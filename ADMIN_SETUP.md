# Admin Dashboard Setup Guide

This guide will help you set up the admin dashboard for managing RSVPs.

## Step 1: Run Database Migration

First, you need to add the approval status field to your RSVPs table. Run the SQL migration file in your Supabase SQL Editor:

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `supabase-add-approval-status.sql`
4. Run the SQL script

This will:
- Add a `status` column to the `rsvps` table (pending, approved, rejected)
- Add a `status` column to the `rsvp_guests` table (pending, approved, rejected)
- Create indexes for faster filtering
- Add RLS policies for authenticated users to read and update RSVPs and guests

## Step 2: Create Admin User

You need to create an admin user in Supabase Authentication:

### Option A: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **Users**
3. Click **Add User** > **Create New User**
4. Enter an email and password for your admin account
5. Click **Create User**

### Option B: Using SQL (for initial setup)

You can also create a user directly via SQL:

```sql
-- Create admin user (replace with your desired email and password)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@example.com',
  crypt('your-secure-password', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);
```

**Note:** The SQL method requires you to hash the password. It's easier to use the dashboard method.

## Step 3: Access the Admin Dashboard

1. Start your development server: `npm run dev`
2. Navigate to `/admin/login`
3. Sign in with the admin credentials you created
4. You'll be redirected to `/admin/dashboard` where you can:
   - View all RSVPs organized by status (Pending, Approved, Rejected)
   - Approve or reject main RSVPs
   - **Approve or reject individual guests** - Each guest can be approved/rejected separately
   - See comprehensive statistics:
     - Total People (all RSVPs + all guests)
     - Pending count (main RSVPs + guests)
     - Approved Attendees (approved main RSVPs + approved guests)
     - Capacity check showing currently approved count
   - View detailed guest information with individual status badges

## Features

- **Authentication**: Protected routes using Supabase Auth
- **RSVP Management**: View, approve, and reject RSVPs
- **Status Filtering**: Tabs to filter RSVPs by status
- **Statistics**: Real-time stats showing total RSVPs and attendees
- **Guest Information**: View all guests associated with each RSVP

## Security Notes

- The admin dashboard is protected by authentication
- Only authenticated users can access `/admin/dashboard`
- RLS policies ensure only authenticated users can read/update RSVPs
- Make sure to use a strong password for your admin account
