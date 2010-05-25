/**
 * Appcelerator Titanium Mobile
 * Copyright (c) 2009-2010 by Appcelerator, Inc. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 */
#import "TiProxy.h"

#ifdef USE_TI_CONTACTS

#import <AddressBook/AddressBook.h>

@class ContactsModule;

@interface TiContactsPerson : TiProxy {
@private
	ABRecordRef record;
	ABRecordID recordId;
	
	// We need this because the record has to live on the main thread
	// (otherwise, we run into all kinds of problems with callbacks and the contacts module and etc.)
	NSMutableDictionary* returnCache;
	ContactsModule* module;
}

@property(readonly,nonatomic) NSNumber* recordId;

+(NSDictionary*)contactProperties;
+(NSDictionary*)multiValueProperties;

-(id)_initWithPageContext:(id<TiEvaluator>)context recordId:(ABRecordID)id_ module:(ContactsModule*)module_;

@end

#endif