/**
 * Appcelerator Titanium Mobile
 * Copyright (c) 2010 by Appcelerator, Inc. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 */
package org.appcelerator.kroll;

/**
 * @deprecated
 */
public interface KrollProperty {

	public boolean supportsGet(String name);
	public Object get(String name);
	
	public boolean supportsSet(String name);
	public void set(String name, Object value);
}
