/**
 * Appcelerator Titanium Mobile
 * Copyright (c) 2010 by Appcelerator, Inc. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 */
package ti.modules.titanium.json;

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

import ti.modules.titanium.json.JSONModule;


/* WARNING: this code is generated for binding methods in Android */
public class JSONModuleBindingGen
	extends org.appcelerator.kroll.KrollModuleBindingGen
{
	private static final String TAG = "JSONModuleBindingGen";

	private static final String METHOD_stringify = "stringify";
	private static final String METHOD_parse = "parse";
	private static final String TOP_LEVEL_JSON = "JSON";
		
	public JSONModuleBindingGen() {
		super();
		// Constants are pre-bound
		
		bindings.put(METHOD_stringify, null);
		bindings.put(METHOD_parse, null);
		
	}

	public void bindContextSpecific(KrollBridge bridge, KrollProxy proxy) {
		bridge.bindToTopLevel(TOP_LEVEL_JSON, proxy);
	}

	@Override
	public Object getBinding(String name) {
		Object value = bindings.get(name);
		if (value != null) { 
			return value;
		}






		// Methods
		if (name.equals(METHOD_stringify)) {
			KrollMethod stringify_method = new KrollMethod(METHOD_stringify) {
				public Object invoke(KrollInvocation __invocation, Object[] __args) throws Exception
				{
	
	KrollBindingUtils.assertRequiredArgs(__args, 1, METHOD_stringify);

	Object __stringify_tmp;
	final org.appcelerator.kroll.KrollConverter __stringify_converter = org.appcelerator.kroll.KrollConverter.getInstance();
		KrollArgument __data_argument = new KrollArgument("data");
		java.lang.Object data;
			__data_argument.setOptional(false);
			
				__stringify_tmp = org.appcelerator.kroll.KrollConverter.getInstance().convertJavascript(__invocation, __args[0], java.lang.Object.class);
				try {
					data = (java.lang.Object) __stringify_tmp;
				} catch (ClassCastException e) {
					throw new IllegalArgumentException("Expected java.lang.Object type for argument \"data\" in \"stringify\", but got " + __stringify_tmp);
				}
		__data_argument.setValue(data);
		__invocation.addArgument(__data_argument);
	
	
	java.lang.String __retVal =
	
	
	((JSONModule) __invocation.getProxy()).stringify(
		data
		);
	return __stringify_converter.convertNative(__invocation, __retVal);
				}
			};
			bindings.put(METHOD_stringify, stringify_method);
			return stringify_method;
		}
		
		if (name.equals(METHOD_parse)) {
			KrollMethod parse_method = new KrollMethod(METHOD_parse) {
				public Object invoke(KrollInvocation __invocation, Object[] __args) throws Exception
				{
	
	KrollBindingUtils.assertRequiredArgs(__args, 1, METHOD_parse);

	Object __parse_tmp;
	final org.appcelerator.kroll.KrollConverter __parse_converter = org.appcelerator.kroll.KrollConverter.getInstance();
		KrollArgument __json_argument = new KrollArgument("json");
		java.lang.String json;
			__json_argument.setOptional(false);
			
				__parse_tmp = org.appcelerator.kroll.KrollConverter.getInstance().convertJavascript(__invocation, __args[0], java.lang.String.class);
				try {
					json = (java.lang.String) __parse_tmp;
				} catch (ClassCastException e) {
					throw new IllegalArgumentException("Expected java.lang.String type for argument \"json\" in \"parse\", but got " + __parse_tmp);
				}
		__json_argument.setValue(json);
		__invocation.addArgument(__json_argument);
	
	
	java.lang.Object __retVal =
	
	
	((JSONModule) __invocation.getProxy()).parse(
		__invocation
		,
		json
		);
	return __parse_converter.convertNative(__invocation, __retVal);
				}
			};
			bindings.put(METHOD_parse, parse_method);
			return parse_method;
		}


		return super.getBinding(name);
	}

	private static final String SHORT_API_NAME = "JSON";
	private static final String FULL_API_NAME = "JSON";
	private static final String ID = "ti.modules.titanium.json.JSONModule";

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
		return new JSONModule(context);
	}

	public Class<? extends KrollProxy> getProxyClass() {
		return JSONModule.class;
	}

	public boolean isModule() {
		return true; 
	}
}