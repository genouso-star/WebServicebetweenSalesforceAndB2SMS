@isTest
public class B2SMSServiceTest {
	static user mainUser;
    static List<MessagePredefini__c> testMessages;
    static{
        id p = [SELECT Id FROM Profile WHERE Name='System Administrator'].Id;
        mainUser = new User(
             Username ='test@acme123.com'
            ,LastName = 'testLastName'
            ,FirstName = 'testFirstName'
            ,Email = 'test@test.com'
            ,LanguageLocaleKey = 'en_US'
            ,TimeZoneSidKey = 'Europe/Paris'
            ,LocaleSidKey = 'en_US'
            ,EmailEncodingKey = 'UTF-8'
            ,Alias = 'JBAL'
            ,IsActive = true
            ,ProfileId = p
            ,UsernameB2SMS__c='test',
            PasswordB2SMS__c ='test'
        );
        insert mainUser;

        System.runAs(mainUser) {
	 	testMessages = new List<MessagePredefini__c>{
            new MessagePredefini__c(Name = 'Test Message 1', Message__c = 'Test Message 1 Content', OwnerId = mainUser.Id),
            new MessagePredefini__c(Name = 'Test Message 2', Message__c = 'Test Message 2 Content', OwnerId = mainUser.Id)
        };
        insert testMessages;

               
        }
    }
    

    @isTest
    static void testCheckLoginCredentials() {
        System.runAs(mainUser) {
            Test.startTest();

        // Appel de la méthode à tester
        Map<String, Object> result = B2SMSService.checkLoginCredentials();

        Test.stopTest();

        // Vérification du résultat
        System.assertEquals(true, (Boolean) result.get('isLoggedIn'));
        System.assertEquals('test', result.get('username'));
    }
        }
          @isTest
    static void testGetMessagesByOwner() {
        
 System.runAs(mainUser) {
            Test.startTest();

        // Appel de la méthode à tester
        List<MessagePredefini__c> retrievedMessages = B2SMSService.getMessagesByOwner();

        Test.stopTest();

        
        // Vérification du résultat
        System.assertEquals(2, retrievedMessages.size());
        System.assertEquals('Test Message 1', retrievedMessages[0].Name);
        System.assertEquals('Test Message 1 Content', retrievedMessages[0].Message__c);
        System.assertEquals('Test Message 2', retrievedMessages[1].Name);
        System.assertEquals('Test Message 2 Content', retrievedMessages[1].Message__c);
    }
       
    }
      @isTest
    static void testDeleteMessageById() {
        System.runAs(mainUser) {
                    Test.startTest();
        B2SMSService.deleteMessageById(testMessages[0].Id);
        Test.stopTest();

        }
    }
    @isTest
    static void testLogOut() {
        System.runAs(mainUser) {
            Test.startTest();
        Boolean isSuccess = B2SMSService.logOut();
        Test.stopTest();
        }
        
    }
    @isTest
    static void testValidateB2smsCredentials_ValidCredentials() {
        // Set the mock callout class
        Test.setMock(HttpCalloutMock.class, new B2SMSServiceHttpMock());

        Test.startTest();
        
        // Call the method to test with valid credentials
        Map<String, Object> result = B2SMSService.validateB2smsCredentials('validusername', 'validpassword');
        
        Test.stopTest();

    }
    @isTest
    static void testPingAPI() {
        // Set the mock callout class
        Test.setMock(HttpCalloutMock.class, new B2SMSServiceHttpMock());

        Test.startTest();
        
        // Call the method to test with valid credentials
        Map<String, Object> result = B2SMSService.pingAPI('validusername', 'validpassword');
        
        Test.stopTest();
    }
     @isTest
    static void testSendBulkSMS() {
        Test.setMock(HttpCalloutMock.class, new B2SMSServiceHttpMock());
        List<String> listNumber = new List<String>{'1234567890', '0987654321'};
        List<String> listContacts = new List<String>{'John Doe', 'Jane Doe'};
        String message = 'Test Message';
        Boolean saveMessage = true;
        String predefinedMessageTitle = 'Test Title';
        String USERNAME = 'validusername';
        String pwd = 'validpassword';
        Datetime combinedDateTime = Datetime.now();
        String tonameCampagne = 'Test Campaign';

        Test.startTest();
        List<Map<String, Object>> result = B2SMSService.sendBulkSMS(
            listNumber,
            listContacts,
            message,
            saveMessage,
            predefinedMessageTitle,
            USERNAME,
            pwd,
            combinedDateTime,
            tonameCampagne
        );

        Test.stopTest();

    }
}