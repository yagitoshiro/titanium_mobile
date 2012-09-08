/**
 * Appcelerator Titanium Mobile
 * Copyright (c) 2009-2012 by Appcelerator, Inc. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 */
package ti.modules.titanium.ui.widget;

import org.appcelerator.kroll.KrollDict;
import org.appcelerator.titanium.TiC;
import org.appcelerator.titanium.proxy.TiViewProxy;
import org.appcelerator.titanium.util.TiConvert;
import org.appcelerator.titanium.view.TiCompositeLayout;
import org.appcelerator.titanium.view.TiCompositeLayout.LayoutArrangement;
import org.appcelerator.titanium.view.TiUIView;

import android.view.View;

public class TiView extends TiUIView
{

	public TiView(TiViewProxy proxy) {
		super(proxy);
		LayoutArrangement arrangement = LayoutArrangement.DEFAULT;

		if (proxy.hasProperty(TiC.PROPERTY_LAYOUT)) {
			String layoutProperty = TiConvert.toString(proxy.getProperty(TiC.PROPERTY_LAYOUT));
			if (layoutProperty.equals(TiC.LAYOUT_HORIZONTAL)) {
				arrangement = LayoutArrangement.HORIZONTAL;
			} else if (layoutProperty.equals(TiC.LAYOUT_VERTICAL)) {
				arrangement = LayoutArrangement.VERTICAL;
			}
		}
		setNativeView(new TiCompositeLayout(proxy.getActivity(), arrangement, proxy));
	}

	@Override
	protected void setOpacity(View view, float opacity)
	{
		super.setOpacity(view, opacity);
		TiCompositeLayout layout = (TiCompositeLayout) nativeView;
		layout.setAlphaCompat(opacity);
	}

	@Override
	public void processProperties(KrollDict d)
	{

		super.processProperties(d);
	}

}
