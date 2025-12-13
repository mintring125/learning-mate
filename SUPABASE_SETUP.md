# Supabase Setup Guide

This project uses Supabase for storing videos and watch history.

## Step 1: Create a Supabase Project
1. Go to [https://supabase.com/](https://supabase.com/) and sign in.
2. Click "New Project".
3. Give it a name (e.g., `learning-mate-db`) and a password.
4. Select a region close to you (e.g., Seoul).
5. Wait for the database to start.

## Step 2: Get API Keys
1. Go to **Project Settings** (Cog icon) -> **API**.
2. Copy the `Project URL`.
3. Copy the `anon` `public` key.
4. Rename `.env.local.example` to `.env.local` in your project root.
5. Paste the URL and Key into the file.

## Step 3: Create Tables
1. Go to the **SQL Editor** (icon on the left sidebar).
2. Click "New Query".
3. Open the `schema.sql` file from this project.
4. Copy the entire content and paste it into the Supabase SQL Editor.
5. Click **Run**.

## Step 4: Ready!
Your database is now set up. You can start the application.
