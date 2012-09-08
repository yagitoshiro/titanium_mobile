/**
 * Appcelerator Titanium Mobile
 * Copyright (c) 2011 by Appcelerator, Inc. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 */
package org.appcelerator.kroll.util;

import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.lang.ref.WeakReference;

import org.appcelerator.kroll.common.TiFastDev;

import android.content.Context;
import android.content.res.AssetManager;
import android.util.Log;

public class KrollAssetHelper
{
	private static final String TAG = "TiAssetHelper";
	private static WeakReference<AssetManager> manager;
	private static String packageName, cacheDir;
	private static AssetCrypt assetCrypt;

	public interface AssetCrypt
	{
		String readAsset(String path);
	}

	public static void setAssetCrypt(AssetCrypt assetCrypt)
	{
		KrollAssetHelper.assetCrypt = assetCrypt;
	}

	public static void init(Context context)
	{
		KrollAssetHelper.manager = new WeakReference<AssetManager>(context.getAssets());
		KrollAssetHelper.packageName = context.getPackageName();
		KrollAssetHelper.cacheDir = context.getCacheDir().getAbsolutePath();
	}

	public static String readAsset(String path)
	{
		String resourcePath = path.replace("Resources/", "");

		if (TiFastDev.isFastDevEnabled()) {
			if (path != null && path.startsWith("Resources/")) {
				Log.d(TAG, "Fetching \"" + resourcePath + "\" with Fastdev...");
				InputStream stream = TiFastDev.getInstance().openInputStream(resourcePath);
				String asset = KrollStreamHelper.toString(stream);
				if (!asset.equals("NOT_FOUND")) {
					return asset;
				} else {
					Log.d(TAG, "File not found with Fastdev.");
				}
			}
		}

		if (assetCrypt != null) {
			String asset = assetCrypt.readAsset(resourcePath);
			if (asset != null) {
				return asset;
			}
		}

		try {
			AssetManager assetManager = manager.get();
			if (assetManager == null) {
				Log.e(TAG, "AssetManager is null, can't read asset: " + path);
				return null;
			}

			InputStream in = assetManager.open(path);
			ByteArrayOutputStream out = new ByteArrayOutputStream();
			byte buffer[] = new byte[1024];
			int count = 0;

			while ((count = in.read(buffer)) != -1) {
				if (out != null) {
					out.write(buffer, 0, count);
				}
			}

			return out.toString();

		} catch (IOException e) {
			Log.e(TAG, "Error while reading asset \"" + path + "\":", e);
		}

		return null;
	}

	public static String readFile(String path)
	{
		try {
			FileInputStream in = new FileInputStream(path);
			ByteArrayOutputStream out = new ByteArrayOutputStream();
			byte buffer[] = new byte[1024];
			int count = 0;

			while ((count = in.read(buffer)) != -1) {
				if (out != null) {
					out.write(buffer, 0, count);
				}
			}

			return out.toString();

		} catch (FileNotFoundException e) {
			Log.e(TAG, "File not found: " + path, e);

		} catch (IOException e) {
			Log.e(TAG, "Error while reading file: " + path, e);
		}

		return null;
	}

	public static boolean fileExists(String path)
	{
		if (TiFastDev.isFastDevEnabled()) {
			if (path != null && path.startsWith("Resources/")) {
				String resourcePath = path.replace("Resources/", "");
				return TiFastDev.getInstance().fileExists(resourcePath);
			}
		}

		return false;
	}

	public static String getPackageName()
	{
		return packageName;
	}

	public static String getCacheDir()
	{
		return cacheDir;
	}
}
