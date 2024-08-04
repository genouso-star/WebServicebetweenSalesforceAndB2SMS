@isTest
global class B2SMSServiceHttpMock implements HttpCalloutMock {
    global HTTPResponse respond(HTTPRequest req) {
        HttpResponse res = new HttpResponse();
        res.setHeader('Content-Type', 'application/json');
        res.setStatusCode(200);

        // Simulate a valid response for validateB2smsCredentials and pingAPI
        if (req.getEndpoint().contains('/v1/ping')) {
            res.setBody('{"X-SMS-Credit": "100"}');
            return res;
        }
        
        // Simulate a valid response for sendBulkSMS
        if (req.getEndpoint().contains('/v1/sms')) {
            res.setBody('{"id": "12345", "custMsgId": "cust-12345", "to": "' + req.getBody() + '", "text": "Test Message", "sendDate": "2023-01-01T00:00:00Z"}');
            return res;
        }

        return res;
    }
    
   
}