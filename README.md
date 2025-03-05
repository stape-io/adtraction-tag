# Adtraction tag for Google Tag Manager Server Side

The Adtraction tag supports two types of events: **Page View** and **Conversion**.

- **Page View event** – Stores the Click ID URL parameter value (`at_gd`) inside the `at_gd` cookie.  
- **Conversion event** – Sends an HTTP request with the specified conversion data to Adtraction.

## How to Use the Adtraction Tag

1. Create an Adtraction tag and add both Page View and Conversion triggers.  
2. For Conversion events, provide the required fields; other values will be automatically parsed from the Event Data.

### Required Fields

- **Program ID** – Provided by Adtraction.  
- **Transaction Type** – Lead or Sale, as provided by Adtraction.  
- **Transaction Type ID** – Provided by Adtraction.  
- **Currency** – If not set, it will be parsed from Event Data.  
- **Order Reference** – If not set, it will be parsed from Event Data. A unique booking/order reference or order ID. If the same order reference is used more than once, it will be considered a duplicate and won't be tracked.  
- **Order Value** – Required only for _Sale_. If not set, it will be parsed from Event Data. Represents the total transaction amount, excluding VAT, delivery costs, and after any discounts have been applied.  
- **Click ID Value** – If not set, it will be parsed from `at_gd` cookie. This must be the Click ID assigned to the user.  

### Optional Fields

- **Discount Code** – If not set, it will be parsed from Event Data. Coupon or voucher code used in the transaction.  
- **MD5 Hashed Email** – The MD5 hashed email of the user.  
- **Last Paid Click Referring Channel** – Specifies the last paid click referring channel.  
- **New Customer** – Set to `true` or `1` for new customers, or `false` or `0` for returning customers.  

## Open Source

Adtraction tag for GTM Server Side is developed and maintained by [Stape Team](https://stape.io/) under the Apache 2.0 license.
