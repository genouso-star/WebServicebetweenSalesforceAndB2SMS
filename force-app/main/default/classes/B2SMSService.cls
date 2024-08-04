public class B2SMSService {
    private static final String API_URL = 'https://www.b2sms.com/v1/sms';
    private static final String API_URLPING = 'https://www.b2sms.com/v1/ping';
    @AuraEnabled
    public static Map<String, Object> checkLoginCredentials() {
        Map<String, Object> result = new Map<String, Object>();
        User currentUser = [SELECT Id, UsernameB2SMS__c, PasswordB2SMS__c FROM User WHERE Id = :UserInfo.getUserId() LIMIT 1];
        result.put('isLoggedIn', (currentUser.UsernameB2SMS__c != null && currentUser.PasswordB2SMS__c != null));
        result.put('username', currentUser.UsernameB2SMS__c);
        result.put('password', currentUser.PasswordB2SMS__c);
        return result;
    }
    public class SMSData {
        public String to { get; set; }
        public String text { get; set; }
        public String sendDate { get; set; }
        public SMSData(String toNumber, String message,string combinedDateTime) {
            to = toNumber;
            text = message;
            sendDate = combinedDateTime;
        }
    }
    
    public class SMSResponse {
        public String id { get; set; }
        public String to { get; set; }
        public String text { get; set; }
        public String sendDate { get; set; }
        
        public SMSResponse(String jsonBody) {
            Map<String, Object> parsedResponse = (Map<String, Object>) JSON.deserializeUntyped(jsonBody);
            id = (String) parsedResponse.get('id');
            to = (String) parsedResponse.get('to');
            text = (String) parsedResponse.get('text');
            sendDate = (String) parsedResponse.get('sendDate');
        }
    }
    @AuraEnabled
    public static List<Map<String, Object>> sendBulkSMS(List<String> listNumber, List<String> listContacts, String message, Boolean saveMessage, String predefinedMessageTitle, String USERNAME, String pwd,Datetime combinedDateTime,string tonameCampagne) {
        List<Map<String, Object>> smsResponses = new List<Map<String, Object>>();
        String iso8601FormattedDate;
        Datetime combinedDateTimes;
        Date endDate;
        if(combinedDateTime !=null){
            Datetime myDatetime = combinedDateTime; 
            iso8601FormattedDate = myDatetime.format('yyyy-MM-dd\'T\'HH:mm:ss.SSSZ'); 
            combinedDateTimes= Datetime.valueOf(combinedDateTime);
            endDate = combinedDateTimes.date();
        
        }else{
            iso8601FormattedDate = null;
            endDate = null;
        }
        
        List<ArchiveMessage__c> messageArchives = new List<ArchiveMessage__c>();
        
        for (Integer i = 0; i < listNumber.size(); i++) {
            String toNumber = listNumber[i];
            String contactName = (i < listContacts.size() && listContacts[i] != null) ? listContacts[i] : 'Inconnu';
            SMSData sms = new SMSData(toNumber, message,iso8601FormattedDate);
            HttpRequest request = new HttpRequest();
            request.setEndpoint(API_URL);
            request.setMethod('POST');
            request.setHeader('Content-Type', 'application/json');
            request.setHeader('Authorization', 'Basic ' + EncodingUtil.base64Encode(Blob.valueOf(USERNAME + ':' + pwd)));
            request.setBody(JSON.serialize(sms));
    
            Http http = new Http();
            
            Map<String, Object> smsResponse = new Map<String, Object>();
            smsResponse.put('contactName', contactName);
            smsResponse.put('to', toNumber);
            smsResponse.put('message', message);
    
            try {
                HttpResponse response = http.send(request);
    
                if (response.getStatusCode() == 200) {
                    Map<String, Object> responseData = (Map<String, Object>) JSON.deserializeUntyped(response.getBody());
                    
                    smsResponse.put('status', 'Envoyé');
                    smsResponse.put('id', responseData.get('id'));
                    smsResponse.put('custMsgId', responseData.get('custMsgId'));
                } else {
                    String errorMessage = 'Erreur lors de l\'envoi du SMS. Code de statut HTTP : ' + response.getStatusCode();
                    Map<String, Object> errorResponse = (Map<String, Object>) JSON.deserializeUntyped(response.getBody());
                    if (errorResponse.containsKey('message')) {
                        errorMessage += ' Message : ' + errorResponse.get('message');
                    }
    
                    smsResponse.put('status', 'Non envoyé');
                    smsResponse.put('errorMessage', errorMessage);
                    
                }
            } catch (Exception e) {
                String errorMessage = 'Exception lors de l\'envoi du SMS: ' + e.getMessage();
    
                smsResponse.put('status', 'Non envoyé');
                smsResponse.put('errorMessage', errorMessage);
                
            }
    
            smsResponses.add(smsResponse);
            
            // Ajouter les enregistrements à insérer dans MessageArchive__c
            ArchiveMessage__c archive = new ArchiveMessage__c(
                ContactName__c = contactName,
                Phone_Number__c = toNumber,
                Message__c = message,
                Status__c = (String) smsResponse.get('status'),
                Error_Message__c = (String) smsResponse.get('errorMessage')
            );
            messageArchives.add(archive);
        }
        
        // Insertion des enregistrements dans ArchiveMessage__c
        if (!messageArchives.isEmpty()) {
            insert messageArchives;
        }
        if (saveMessage) {
            MessagePredefini__c newMessage = new MessagePredefini__c();
            newMessage.Message__c = message;
            newMessage.Name = predefinedMessageTitle;
            insert newMessage;
        }
        if (tonameCampagne !=null) {
            Campaign newCampaign = new Campaign();
            newCampaign.Name = tonameCampagne;
            newCampaign.StartDate = System.today();
            newCampaign.EndDate = endDate;
            newCampaign.Type = 'SMS';
            newCampaign.IsActive = true;
            insert newCampaign;
        }
        return smsResponses;
    }
    
    
    /*@AuraEnabled(cacheable=true)
    public static List<Account> getAccountNames() {
        return [SELECT Id, Name, Phone FROM Account];
    }*/
    
    @AuraEnabled(cacheable=true)
    public static List<MessagePredefini__c> getMessagesByOwner() {
        Id user = UserInfo.getUserId();
        return [SELECT Id, Name, Message__c FROM MessagePredefini__c WHERE OwnerId = :user];
    }
    
    @AuraEnabled
    public static void deleteMessageById(String messageId) {
        try {
            MessagePredefini__c message = [SELECT Id FROM MessagePredefini__c WHERE Id = :messageId LIMIT 1];
            delete message;
        } catch (Exception e) {
            throw new AuraHandledException('Error deleting message: ' + e.getMessage());
        }
    }
    @AuraEnabled
public static Boolean logOut() {
    Boolean isSuccess = false;
    try {
        User userB2SMS = new User(
            Id = UserInfo.getUserId(),
            UsernameB2SMS__c = '',
            PasswordB2SMS__c = ''
        );
        update userB2SMS;
        isSuccess = true;
    } catch (Exception e) {
    }
    return isSuccess;
}
@AuraEnabled
public static Map<String, Object> validateB2smsCredentials(String username, String password) {
    Map<String, Object> pingResponse = new Map<String, Object>();
    HttpRequest request = new HttpRequest();
    request.setEndpoint(API_URLPING);
    request.setMethod('GET'); // Utilisez 'GET' ou la méthode appropriée pour le ping
    request.setHeader('Authorization', 'Basic ' + EncodingUtil.base64Encode(Blob.valueOf(username + ':' + password)));
    
    Http http = new Http();
    HttpResponse response = http.send(request);
    Map<String, Object> errorResponse = (Map<String, Object>) JSON.deserializeUntyped(response.getBody());
    if (errorResponse.get('message') == '[AUTH:WRONG_USER] Wrong user or password given') {
        return pingResponse;
    } else {
        try {
            Map<String, String> responseHeaders = new Map<String, String>();
        for (String headerKey : response.getHeaderKeys()) {
            responseHeaders.put(headerKey, response.getHeader(headerKey));
        }

        pingResponse.put('statusCode', response.getStatusCode());
        pingResponse.put('status', response.getStatus());
        pingResponse.put('headers', responseHeaders);
        pingResponse.put('X-SMS-Credit', response.getHeader('X-SMS-Credit'));
        pingResponse.put('valid', true);
        if (response.getStatusCode() == 200) {
            pingResponse.put('body', response.getBody());
        } else {
            pingResponse.put('error', 'Erreur lors du ping. Code de statut HTTP : ' + response.getStatusCode());
        }
            User userB2SMS = new User(
                Id = UserInfo.getUserId(),
                UsernameB2SMS__c = username,
                PasswordB2SMS__c = password
            );
            update userB2SMS;  
            return pingResponse;
        } catch (Exception e) {
            return pingResponse;
        }
    }
}
@AuraEnabled(cacheable=true)
public static Map<String, Object> pingAPI(String username, String password) {
    Map<String, Object> pingResponse = new Map<String, Object>();

    HttpRequest request = new HttpRequest();
    request.setEndpoint(API_URLPING);
    request.setMethod('GET'); // Utilisez 'GET' ou la méthode appropriée pour le ping
    request.setHeader('Authorization', 'Basic ' + EncodingUtil.base64Encode(Blob.valueOf(username + ':' + password)));
    
    Http http = new Http();

    try {
        HttpResponse response = http.send(request);

        Map<String, String> responseHeaders = new Map<String, String>();
        for (String headerKey : response.getHeaderKeys()) {
            responseHeaders.put(headerKey, response.getHeader(headerKey));
        }

        pingResponse.put('statusCode', response.getStatusCode());
        pingResponse.put('status', response.getStatus());
        pingResponse.put('headers', responseHeaders);
        pingResponse.put('X-SMS-Credit', response.getHeader('X-SMS-Credit'));

        if (response.getStatusCode() == 200) {
            pingResponse.put('body', response.getBody());
        } else {
            pingResponse.put('error', 'Erreur lors du ping. Code de statut HTTP : ' + response.getStatusCode());
        }
    } catch (Exception e) {
        // Dans ce cas, nous ne pouvons pas obtenir les en-têtes car l'exception empêche l'accès à la réponse HTTP
        String errorMessage = 'Exception lors du ping: ' + e.getMessage();
        pingResponse.put('error', errorMessage);
    }

    return pingResponse;
}



}