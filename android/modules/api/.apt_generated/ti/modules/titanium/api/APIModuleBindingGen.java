/**
 * Appcelerator Titanium Mobile
 * Copyright (c) 2010 by Appcelerator, Inc. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 */
package ti.modules.titanium.api;

import org.appcelerator.kroll.KrollArgument;
import org.appcelerator.kroll.KrollProxy;
import org.appcelerator.kroll.KrollConverter;
import org.appcelerator.kroll.KrollInvocation;
import org.appcelerator.kroll.KrollMethod;
import org.appcelerator.kroll.KrollModule;
import org.appcelerator.kroll.KrollProxyBinding;
import org.appcelerator.kroll.KrollModuleBinding;
import org.appcelerator.kroll.KrollDynamicProperty;
import org.appcelerator.kroll.KrollReflectionProperty;
import org.appcelerator.kroll.KrollInjector;
import org.appcelerator.kroll.KrollDict;
import org.appcelerator.kroll.KrollDefaultValueProvider;
import org.appcelerator.kroll.util.KrollReflectionUtils;
import org.appcelerator.kroll.util.KrollBindingUtils;
import org.appcelerator.titanium.kroll.KrollBridge;
import org.appcelerator.titanium.TiContext;
import org.appcelerator.titanium.util.Log;

import org.mozilla.javascript.Scriptable;

import java.util.HashMap;

import ti.modules.titanium.api.APIModule;


/* WARNING: this code is generated for binding methods in Android */
public class APIModuleBindingGen
	extends org.appcelerator.kroll.KrollModuleBindingGen
{
	private static final String TAG = "APIModuleBindingGen";

	private static final String CONST_NOTICE = "NOTICE";
	private static final String CONST_ERROR = "ERROR";
	private static final String CONST_CRITICAL = "CRITICAL";
	private static final String CONST_FATAL = "FATAL";
	private static final String CONST_INFO = "INFO";
	private static final String CONST_WARN = "WARN";
	private static final String CONST_DEBUG = "DEBUG";
	private static final String CONST_TRACE = "TRACE";
	private static final String METHOD_warn = "warn";
	private static final String METHOD_critical = "critical";
	private static final String METHOD_error = "error";
	private static final String METHOD_trace = "trace";
	private static final String METHOD_fatal = "fatal";
	private static final String METHOD_debug = "debug";
	private static final String METHOD_notice = "notice";
	private static final String METHOD_log = "log";
	private static final String METHOD_info = "info";
		
	public APIModuleBindingGen() {
		super();
		// Constants are pre-bound
		bindings.put(CONST_NOTICE, APIModule.NOTICE);
		bindings.put(CONST_ERROR, APIModule.ERROR);
		bindings.put(CONST_CRITICAL, APIModule.CRITICAL);
		bindings.put(CONST_FATAL, APIModule.FATAL);
		bindings.put(CONST_INFO, APIModule.INFO);
		bindings.put(CONST_WARN, APIModule.WARN);
		bindings.put(CONST_DEBUG, APIModule.DEBUG);
		bindings.put(CONST_TRACE, APIModule.TRACE);
		
		bindings.put(METHOD_warn, null);
		bindings.put(METHOD_critical, null);
		bindings.put(METHOD_error, null);
		bindings.put(METHOD_trace, null);
		bindings.put(METHOD_fatal, null);
		bindings.put(METHOD_debug, null);
		bindings.put(METHOD_notice, null);
		bindings.put(METHOD_log, null);
		bindings.put(METHOD_info, null);
		
	}

	public void bindContextSpecific(KrollBridge bridge, KrollProxy proxy) {
	}

	@Override
	public Object getBinding(String name) {
		Object value = bindings.get(name);
		if (value != null) { 
			return value;
		}






		// Methods
		if (name.equals(METHOD_warn)) {
			KrollMethod warn_method = new KrollMethod(METHOD_warn) {
				public Object invoke(KrollInvocation __invocation, Object[] __args) throws Exception
				{
	
	KrollBindingUtils.assertRequiredArgs(__args, 1, METHOD_warn);

	Object __warn_tmp;
		KrollArgument __msg_argument = new KrollArgument("msg");
		java.lang.Object msg;
			__msg_argument.setOptional(false);
			
				__warn_tmp = org.appcelerator.kroll.KrollConverter.getInstance().convertJavascript(__invocation, __args[0], java.lang.Object.class);
				try {
					msg = (java.lang.Object) __warn_tmp;
				} catch (ClassCastException e) {
					throw new IllegalArgumentException("Expected java.lang.Object type for argument \"msg\" in \"warn\", but got " + __warn_tmp);
				}
		__msg_argument.setValue(msg);
		__invocation.addArgument(__msg_argument);
	
	
	
	
	((APIModule) __invocation.getProxy()).warn(
		msg
		);
		return KrollProxy.UNDEFINED;
				}
			};
			bindings.put(METHOD_warn, warn_method);
			return warn_method;
		}
		
		if (name.equals(METHOD_critical)) {
			KrollMethod critical_method = new KrollMethod(METHOD_critical) {
				public Object invoke(KrollInvocation __invocation, Object[] __args) throws Exception
				{
	
	KrollBindingUtils.assertRequiredArgs(__args, 1, METHOD_critical);

	Object __critical_tmp;
		KrollArgument __msg_argument = new KrollArgument("msg");
		java.lang.Object msg;
			__msg_argument.setOptional(false);
			
				__critical_tmp = org.appcelerator.kroll.KrollConverter.getInstance().convertJavascript(__invocation, __args[0], java.lang.Object.class);
				try {
					msg = (java.lang.Object) __critical_tmp;
				} catch (ClassCastException e) {
					throw new IllegalArgumentException("Expected java.lang.Object type for argument \"msg\" in \"critical\", but got " + __critical_tmp);
				}
		__msg_argument.setValue(msg);
		__invocation.addArgument(__msg_argument);
	
	
	
	
	((APIModule) __invocation.getProxy()).critical(
		msg
		);
		return KrollProxy.UNDEFINED;
				}
			};
			bindings.put(METHOD_critical, critical_method);
			return critical_method;
		}
		
		if (name.equals(METHOD_error)) {
			KrollMethod error_method = new KrollMethod(METHOD_error) {
				public Object invoke(KrollInvocation __invocation, Object[] __args) throws Exception
				{
	
	KrollBindingUtils.assertRequiredArgs(__args, 1, METHOD_error);

	Object __error_tmp;
		KrollArgument __msg_argument = new KrollArgument("msg");
		java.lang.Object msg;
			__msg_argument.setOptional(false);
			
				__error_tmp = org.appcelerator.kroll.KrollConverter.getInstance().convertJavascript(__invocation, __args[0], java.lang.Object.class);
				try {
					msg = (java.lang.Object) __error_tmp;
				} catch (ClassCastException e) {
					throw new IllegalArgumentException("Expected java.lang.Object type for argument \"msg\" in \"error\", but got " + __error_tmp);
				}
		__msg_argument.setValue(msg);
		__invocation.addArgument(__msg_argument);
	
	
	
	
	((APIModule) __invocation.getProxy()).error(
		msg
		);
		return KrollProxy.UNDEFINED;
				}
			};
			bindings.put(METHOD_error, error_method);
			return error_method;
		}
		
		if (name.equals(METHOD_trace)) {
			KrollMethod trace_method = new KrollMethod(METHOD_trace) {
				public Object invoke(KrollInvocation __invocation, Object[] __args) throws Exception
				{
	
	KrollBindingUtils.assertRequiredArgs(__args, 1, METHOD_trace);

	Object __trace_tmp;
		KrollArgument __msg_argument = new KrollArgument("msg");
		java.lang.Object msg;
			__msg_argument.setOptional(false);
			
				__trace_tmp = org.appcelerator.kroll.KrollConverter.getInstance().convertJavascript(__invocation, __args[0], java.lang.Object.class);
				try {
					msg = (java.lang.Object) __trace_tmp;
				} catch (ClassCastException e) {
					throw new IllegalArgumentException("Expected java.lang.Object type for argument \"msg\" in \"trace\", but got " + __trace_tmp);
				}
		__msg_argument.setValue(msg);
		__invocation.addArgument(__msg_argument);
	
	
	
	
	((APIModule) __invocation.getProxy()).trace(
		msg
		);
		return KrollProxy.UNDEFINED;
				}
			};
			bindings.put(METHOD_trace, trace_method);
			return trace_method;
		}
		
		if (name.equals(METHOD_fatal)) {
			KrollMethod fatal_method = new KrollMethod(METHOD_fatal) {
				public Object invoke(KrollInvocation __invocation, Object[] __args) throws Exception
				{
	
	KrollBindingUtils.assertRequiredArgs(__args, 1, METHOD_fatal);

	Object __fatal_tmp;
		KrollArgument __msg_argument = new KrollArgument("msg");
		java.lang.Object msg;
			__msg_argument.setOptional(false);
			
				__fatal_tmp = org.appcelerator.kroll.KrollConverter.getInstance().convertJavascript(__invocation, __args[0], java.lang.Object.class);
				try {
					msg = (java.lang.Object) __fatal_tmp;
				} catch (ClassCastException e) {
					throw new IllegalArgumentException("Expected java.lang.Object type for argument \"msg\" in \"fatal\", but got " + __fatal_tmp);
				}
		__msg_argument.setValue(msg);
		__invocation.addArgument(__msg_argument);
	
	
	
	
	((APIModule) __invocation.getProxy()).fatal(
		msg
		);
		return KrollProxy.UNDEFINED;
				}
			};
			bindings.put(METHOD_fatal, fatal_method);
			return fatal_method;
		}
		
		if (name.equals(METHOD_debug)) {
			KrollMethod debug_method = new KrollMethod(METHOD_debug) {
				public Object invoke(KrollInvocation __invocation, Object[] __args) throws Exception
				{
	
	KrollBindingUtils.assertRequiredArgs(__args, 1, METHOD_debug);

	Object __debug_tmp;
		KrollArgument __msg_argument = new KrollArgument("msg");
		java.lang.Object msg;
			__msg_argument.setOptional(false);
			
				__debug_tmp = org.appcelerator.kroll.KrollConverter.getInstance().convertJavascript(__invocation, __args[0], java.lang.Object.class);
				try {
					msg = (java.lang.Object) __debug_tmp;
				} catch (ClassCastException e) {
					throw new IllegalArgumentException("Expected java.lang.Object type for argument \"msg\" in \"debug\", but got " + __debug_tmp);
				}
		__msg_argument.setValue(msg);
		__invocation.addArgument(__msg_argument);
	
	
	
	
	((APIModule) __invocation.getProxy()).debug(
		msg
		);
		return KrollProxy.UNDEFINED;
				}
			};
			bindings.put(METHOD_debug, debug_method);
			return debug_method;
		}
		
		if (name.equals(METHOD_notice)) {
			KrollMethod notice_method = new KrollMethod(METHOD_notice) {
				public Object invoke(KrollInvocation __invocation, Object[] __args) throws Exception
				{
	
	KrollBindingUtils.assertRequiredArgs(__args, 1, METHOD_notice);

	Object __notice_tmp;
		KrollArgument __msg_argument = new KrollArgument("msg");
		java.lang.Object msg;
			__msg_argument.setOptional(false);
			
				__notice_tmp = org.appcelerator.kroll.KrollConverter.getInstance().convertJavascript(__invocation, __args[0], java.lang.Object.class);
				try {
					msg = (java.lang.Object) __notice_tmp;
				} catch (ClassCastException e) {
					throw new IllegalArgumentException("Expected java.lang.Object type for argument \"msg\" in \"notice\", but got " + __notice_tmp);
				}
		__msg_argument.setValue(msg);
		__invocation.addArgument(__msg_argument);
	
	
	
	
	((APIModule) __invocation.getProxy()).notice(
		msg
		);
		return KrollProxy.UNDEFINED;
				}
			};
			bindings.put(METHOD_notice, notice_method);
			return notice_method;
		}
		
		if (name.equals(METHOD_log)) {
			KrollMethod log_method = new KrollMethod(METHOD_log) {
				public Object invoke(KrollInvocation __invocation, Object[] __args) throws Exception
				{
	
	KrollBindingUtils.assertRequiredArgs(__args, 2, METHOD_log);

	Object __log_tmp;
		KrollArgument __level_argument = new KrollArgument("level");
		java.lang.String level;
			__level_argument.setOptional(false);
			
				__log_tmp = org.appcelerator.kroll.KrollConverter.getInstance().convertJavascript(__invocation, __args[0], java.lang.String.class);
				try {
					level = (java.lang.String) __log_tmp;
				} catch (ClassCastException e) {
					throw new IllegalArgumentException("Expected java.lang.String type for argument \"level\" in \"log\", but got " + __log_tmp);
				}
		__level_argument.setValue(level);
		__invocation.addArgument(__level_argument);
		KrollArgument __msg_argument = new KrollArgument("msg");
		java.lang.Object msg;
			__msg_argument.setOptional(false);
			
				__log_tmp = org.appcelerator.kroll.KrollConverter.getInstance().convertJavascript(__invocation, __args[1], java.lang.Object.class);
				try {
					msg = (java.lang.Object) __log_tmp;
				} catch (ClassCastException e) {
					throw new IllegalArgumentException("Expected java.lang.Object type for argument \"msg\" in \"log\", but got " + __log_tmp);
				}
		__msg_argument.setValue(msg);
		__invocation.addArgument(__msg_argument);
	
	
	
	
	((APIModule) __invocation.getProxy()).log(
		level,
				msg
		);
		return KrollProxy.UNDEFINED;
				}
			};
			bindings.put(METHOD_log, log_method);
			return log_method;
		}
		
		if (name.equals(METHOD_info)) {
			KrollMethod info_method = new KrollMethod(METHOD_info) {
				public Object invoke(KrollInvocation __invocation, Object[] __args) throws Exception
				{
	
	KrollBindingUtils.assertRequiredArgs(__args, 1, METHOD_info);

	Object __info_tmp;
		KrollArgument __msg_argument = new KrollArgument("msg");
		java.lang.Object msg;
			__msg_argument.setOptional(false);
			
				__info_tmp = org.appcelerator.kroll.KrollConverter.getInstance().convertJavascript(__invocation, __args[0], java.lang.Object.class);
				try {
					msg = (java.lang.Object) __info_tmp;
				} catch (ClassCastException e) {
					throw new IllegalArgumentException("Expected java.lang.Object type for argument \"msg\" in \"info\", but got " + __info_tmp);
				}
		__msg_argument.setValue(msg);
		__invocation.addArgument(__msg_argument);
	
	
	
	
	((APIModule) __invocation.getProxy()).info(
		msg
		);
		return KrollProxy.UNDEFINED;
				}
			};
			bindings.put(METHOD_info, info_method);
			return info_method;
		}


		return super.getBinding(name);
	}

	private static final String SHORT_API_NAME = "API";
	private static final String FULL_API_NAME = "API";
	private static final String ID = "ti.modules.titanium.api.APIModule";

	public String getAPIName() {
		return FULL_API_NAME;
	}

	public String getShortAPIName() {
		return SHORT_API_NAME;
	}

	public String getId() {
		return ID;
	}

	public KrollModule newInstance(TiContext context) {
		return new APIModule(context);
	}

	public Class<? extends KrollProxy> getProxyClass() {
		return APIModule.class;
	}

	public boolean isModule() {
		return true; 
	}
}