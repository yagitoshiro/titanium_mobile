/**
 * Appcelerator Titanium Mobile
 * Copyright (c) 2009-2012 by Appcelerator, Inc. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 */
package ti.modules.titanium;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.text.DateFormat;
import java.text.DecimalFormat;
import java.text.NumberFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Stack;

import org.appcelerator.kroll.KrollFunction;
import org.appcelerator.kroll.KrollModule;
import org.appcelerator.kroll.KrollRuntime;
import org.appcelerator.kroll.annotations.Kroll;
import org.appcelerator.kroll.common.Log;
import org.appcelerator.titanium.TiApplication;
import org.appcelerator.titanium.util.TiConvert;
import org.appcelerator.titanium.util.TiPlatformHelper;
import org.appcelerator.titanium.util.TiRHelper;
import org.appcelerator.titanium.util.TiUIHelper;

import android.app.Activity;
import android.os.Environment;
import android.os.Handler;
import android.util.SparseArray;

@Kroll.module @Kroll.topLevel({"Ti", "Titanium"})
public class TitaniumModule extends KrollModule
{
	private static final String TAG = "TitaniumModule";

	private Stack<String> basePath;
	private Map<String, NumberFormat> numberFormats = java.util.Collections.synchronizedMap(
		new HashMap<String, NumberFormat>());

	private static final SparseArray<Timer> activeTimers = new SparseArray<TitaniumModule.Timer>();
	private static int lastTimerId = 1;

	public TitaniumModule()
	{
		basePath = new Stack<String>();
		/* TODO if (tiContext.isServiceContext()) {
			tiContext.addOnServiceLifecycleEventListener(this);
		} else {
			tiContext.addOnLifecycleEventListener(this);
		}*/
	}

	@Override
	protected void initActivity(Activity activity)
	{
		super.initActivity(activity);
		basePath.push(getCreationUrl().baseUrl);
	}

	@Kroll.getProperty @Kroll.method
	public String getUserAgent()
	{
		StringBuilder builder = new StringBuilder();
		String httpAgent = System.getProperty("http.agent");
		if (httpAgent != null) {
			builder.append(httpAgent);
		}
		builder.append(" Titanium/")
			.append(getVersion());
		return builder.toString();
	}

	@Kroll.getProperty @Kroll.method
	public String getVersion()
	{
		return TiApplication.getInstance().getTiBuildVersion();
	}

	@Kroll.getProperty @Kroll.method
	public String getBuildTimestamp()
	{
		return TiApplication.getInstance().getTiBuildTimestamp();
	}

	@Kroll.getProperty @Kroll.method
	public String getBuildDate()
	{
		return TiApplication.getInstance().getTiBuildTimestamp();
	}

	@Kroll.getProperty @Kroll.method
	public String getBuildHash()
	{
		return TiApplication.getInstance().getTiBuildHash();
	}

	// For testing exception handling.  Can remove after ticket 2032
	@Kroll.method
	public void testThrow(){ throw new Error("Testing throwing throwables"); }

	private class Timer implements Runnable
	{
		protected long timeout;
		protected boolean interval;
		protected Object[] args;
		protected KrollFunction callback;
		protected Handler handler;
		protected int id;
		protected boolean canceled;
	
		public Timer(int id, Handler handler, KrollFunction callback, long timeout, Object[] args, boolean interval)
		{
			this.id = id;
			this.handler = handler;
			this.callback = callback;
			this.timeout = timeout;
			this.args = args;
			this.interval = interval;
		}

		public void schedule()
		{
			handler.postDelayed(this, timeout);
		}

		public void run()
		{
			if (canceled) {
				return;
			}

			if (Log.isDebugModeEnabled()) {
				StringBuilder message = new StringBuilder("calling ")
					.append(interval ? "interval" : "timeout")
					.append(" timer ")
					.append(id)
					.append(" @")
					.append(new Date().getTime());

				Log.d(TAG, message.toString());
			}

			long start = System.currentTimeMillis();
			callback.call(getKrollObject(), args);

			// If this timer is repeating schedule it for another round.
			// Otherwise remove the timer from the active list and quit.
			if (interval && !canceled) {
				handler.postDelayed(this, timeout - (System.currentTimeMillis() - start));

			} else {
				activeTimers.remove(id);
			}
		}

		public void cancel()
		{
			handler.removeCallbacks(this);
			canceled = true;
		}
	}

	private int createTimer(KrollFunction callback, long timeout, Object[] args, boolean interval)
	{
		// Generate an unique identifier for this timer.
		// This will later be used by the developer to cancel a timer.
		final int timerId = lastTimerId++;

		Timer timer = new Timer(timerId, getRuntimeHandler(), callback, timeout, args, interval);
		activeTimers.append(timerId, timer);

		timer.schedule();

		return timerId;
	}

	private void cancelTimer(int timerId)
	{
		Timer timer = activeTimers.get(timerId);
		if (timer != null) {
			timer.cancel();
			activeTimers.remove(timerId);
		}
	}

	public static void cancelTimers()
	{
		final int timerCount = activeTimers.size();
		for (int i = 0; i < timerCount; i++) {
			Timer timer = activeTimers.valueAt(i);
			timer.cancel();
		}

		activeTimers.clear();
	}

	@Kroll.method @Kroll.topLevel
	public int setTimeout(KrollFunction krollFunction, long timeout, final Object[] args)
	{
		return createTimer(krollFunction, timeout, args, false);
	}

	@Kroll.method @Kroll.topLevel
	public int setInterval(KrollFunction krollFunction, long timeout, final Object[] args)
	{
		return createTimer(krollFunction, timeout, args, true);
	}

	@Kroll.method @Kroll.topLevel
	public void clearTimeout(int timerId)
	{
		cancelTimer(timerId);
	}

	@Kroll.method @Kroll.topLevel
	public void clearInterval(int timerId)
	{
		cancelTimer(timerId);
	}

	@Kroll.method @Kroll.topLevel
	public void alert(Object message)
	{
		String msg = (message == null? null : message.toString());
		Log.i("ALERT", msg);

		/* TODO - look at this along with the other service stuff
		if (invocation.getTiContext().isServiceContext()) {
			Log.w(LCAT, "alert() called inside service -- no attempt will be made to display it to user interface.");
			return;
		}
		*/

		TiUIHelper.doOkDialog("Alert", msg, null);
	}

	@Kroll.method @Kroll.topLevel("String.format")
	public String stringFormat(String format, Object args[])
	{
		try {
			// Rhino will always convert Number values to doubles.
			// To prevent conversion errors we will change all decimal
			// format arguments to floating point.
			if (KrollRuntime.getInstance().getRuntimeName().equals("rhino")) {
				format = format.replaceAll("%d", "%1.0f");
			}

			// in case someone passes an iphone formatter symbol, convert
			format = format.replaceAll("%@", "%s");

			if (args.length == 0) {
				return String.format(format);

			} else {
				return String.format(format, args);
			}

		} catch (Exception ex) {
			Log.e(TAG, "Error occured while formatting string", ex);
			return null;
		}
	}

	@Kroll.method @Kroll.topLevel("String.formatDate")
	public String stringFormatDate(Date date, @Kroll.argument(optional=true) String format)
	{
		int style = DateFormat.SHORT;

		if (format != null) {
			if (format.equals("medium")) {
				style = DateFormat.MEDIUM;

			} else if (format.equals("long")) {
				style = DateFormat.LONG;
			}
		}

		return (DateFormat.getDateInstance(style)).format(date);
	}

	@Kroll.method @Kroll.topLevel("String.formatTime")
	public String stringFormatTime(Date time)
	{
		int style = DateFormat.SHORT;

		return (DateFormat.getTimeInstance(style)).format(time);
	}

	@Kroll.method @Kroll.topLevel("String.formatCurrency")
	public String stringFormatCurrency(double currency)
	{
		return NumberFormat.getCurrencyInstance().format(currency);
	}

	@Kroll.method @Kroll.topLevel("String.formatDecimal")
	public String stringFormatDecimal(Object args[])
	{
		String pattern = null;
		String locale = null;

		if (args.length == 2) {
			// Is the second argument a locale string or a format string?
			String test = TiConvert.toString(args[1]);
			if (test != null && test.length() > 0) {
				if (test.contains(".") || test.contains("#") || test.contains("0")) {
					pattern = test;

				} else {
					locale = test;
				}
			}

		} else if (args.length >= 3) {
			// this is: stringFormatDecimal(n, locale_string, pattern_string);
			locale = TiConvert.toString(args[1]);
			pattern = TiConvert.toString(args[2]);
		}

		String key = (locale == null ? "" : locale ) + " keysep " + (pattern == null ? "": pattern);
		
		NumberFormat format;
		if (numberFormats.containsKey(key)) {
			format = numberFormats.get(key);

		} else {
			if (locale != null) {
				format = NumberFormat.getInstance(TiPlatformHelper.getLocale(locale));

			} else {
				format = NumberFormat.getInstance();
			}
		
			if (pattern != null && format instanceof DecimalFormat) {
				((DecimalFormat)format).applyPattern(pattern);
			}

			numberFormats.put(key, format);
		}

		return format.format((Number)args[0]);
	}

	@Kroll.method @Kroll.topLevel("L")
	public String localize(Object args[])
	{
		String key = (String) args[0];
		String defaultValue = args.length > 1 ? (String) args[1] : null;

		try {
			int resid = TiRHelper.getResource("string." + key);
			if (resid != 0) {
				return TiApplication.getInstance().getString(resid);

			} else {
				return defaultValue;
			}

		} catch (TiRHelper.ResourceNotFoundException e) {
			Log.d(TAG, "Resource string with key '" + key + "' not found.  Returning default value.", Log.DEBUG_MODE);

			return defaultValue;

		} catch (Exception e) {
			Log.e(TAG, "Exception trying to localize string '" + key + "': ", e);

			return defaultValue;
		}
	}

	@Kroll.method
	public void dumpCoverage()
	{
		TiApplication app = TiApplication.getInstance();
		if (app == null || !app.isCoverageEnabled()) {
			Log.w(TAG, "Coverage is not enabled, no coverage data will be generated");

			return;
		}

		try {
			File extStorage = Environment.getExternalStorageDirectory();
			File reportFile = new File(new File(extStorage, app.getPackageName()), "coverage.json");
			FileOutputStream reportOut = new FileOutputStream(reportFile);
			// TODO KrollCoverage.writeCoverageReport(reportOut);
			reportOut.close();

		} catch (IOException e) {
			Log.e(TAG, e.getMessage(), e);
		}
	}
}

