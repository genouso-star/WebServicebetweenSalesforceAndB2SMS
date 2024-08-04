import {LightningElement,track,wire,api} from 'lwc';
import sendBulkSMS from '@salesforce/apex/B2SMSService.sendBulkSMS';
import getMessagesByOwner from '@salesforce/apex/B2SMSService.getMessagesByOwner';
import deleteMessageById from '@salesforce/apex/B2SMSService.deleteMessageById';
import validateB2smsCredentials from '@salesforce/apex/B2SMSService.validateB2smsCredentials';
import checkLoginCredentials from '@salesforce/apex/B2SMSService.checkLoginCredentials';
import pingAPI from '@salesforce/apex/B2SMSService.pingAPI';
import logOut from '@salesforce/apex/B2SMSService.logOut';
import logoB2SMS from '@salesforce/resourceUrl/logoB2SMS';
import Arrow from '@salesforce/resourceUrl/IconArrow';
export default class WebserviceSms extends LightningElement {
	logo = logoB2SMS;
	IconArrow = Arrow;
	previousTabValue = '';
	@track dateValue = '';
	@track timeValue = '';
	@track tonameCampagne = null;
	@track pingResponse;
	@track inputValid = false;
	@track activeTabValue = 'messageLibre';
	@track addingMessage = false;
	@track remainingCharacters = 612;
	@track numMessages = 1;
	@track toNumbers = '';
	@track message = '';
	@track selectedAccount = '';
	@track accountOptions = [];
	@track selectedAccountPhone = '';
	@track addedNumbers = [];
	@track selectedMessageValue = '';
	@track messages = [];
	@track isModalOpen = false;
	@track predefinedMessageTitle = '';
	@track isSaveMessage = false;
	@track isLoading1 = false;
	@track isLoading2 = false;
	@api records = [];
	@track choicefinish = false;
	@track selectedCompte = '';
	@api recordId;
	@track username = '';
	@track password = '';
	@track isLoginModalOpen = true;
	@track error = false;
	@track errorMessage = false;
	@track errornumberVide = false;
	@track nextStepButtonMessage = true;
	@track nextStepButtonEnvoi = true;
	@track showIcon = false;
	@track xSmsCredit = '';
	MAX_CHARS_PER_SMS = [160, 306, 459, 612];
	handleDateChange(event) {
		this.dateValue = event.target.value;
	}

	handleTimeChange(event) {
		this.timeValue = event.target.value;
	}
	nextstepMessage(event) {
		const messageButton = this.template.querySelector('[data-section-id="message"]');
		messageButton.click();
	}
	nextstepEnvoi(event) {
		const envoiButton = this.template.querySelector('[data-section-id="envoi"]');
		envoiButton.click();
	}

	toggleContent(event) {
		const clickedSectionId = event.target.dataset.sectionId;
		const allSections = this.template.querySelectorAll('.content');

		allSections.forEach(section => {
			const sectionId = section.dataset.sectionId;
			if (sectionId !== clickedSectionId) {
				section.style.display = 'none';
			}
		});

		const content = event.target.nextElementSibling;
		content.style.display = (content.style.display === 'block') ? 'none' : 'block';
	}
	get accountOptions() {
		return this.records.map(record => ({
			label: record.Name,
			value: record.Id
		}));
	}

	connectedCallback() {
		this.isLoading1 = true;

		checkLoginCredentials()
			.then(result => {

				if (result.isLoggedIn) {
					this.username = result.username;
					this.password = result.password;
					pingAPI({
							username: result.username,
							password: result.password
						})
						.then(result => {
							this.pingResponse = result;
							this.xSmsCredit = result.headers['X-SMS-Credit'];
							this.isLoading1 = false;
							this.isLoginModalOpen = false;
						})
						.catch(error => {
							this.pingResponse = {
								error: 'Erreur lors de la récupération des données'
							};
							console.error(error);
						});
				} else {
					this.isLoading1 = false;
					this.isLoginModalOpen = true;
				}
			})
			.catch(error => {
			});
		this.accountOptions = this.records.map(record => {
			// Vérifie si les données existent dans l'enregistrement
			const name = record.Name || '';
			const phone = record.Phone || '';
			const contactId = record.Id || '';
			const mail = record.Email || '';

			// Construit l'objet avec les données disponibles
			return {
				label: name,
				value: contactId,
				phone: phone,
				mail: mail
			};
		});
		if (this.accountOptions.length > 0) {
			this.nextStepButtonMessage = false;
		}
		if (!this.nextStepButtonMessage) {
			this.showIcon = true;
		} else {
			this.showIcon = false;
		}
	}
	/*@wire(getAccountNames)
	wiredAccounts({ error, data }) {
	    if (data) {
	        this.accountOptions = data.map(account => {
	            return { label: account.Name, value: account.Id, phone: account.Phone };
	        });
	    } else if (error) {
	        console.error('Error loading accounts', error);
	    }
	}*/

	@wire(getMessagesByOwner)
	wiredMessages({
		error,
		data
	}) {
		if (data) {
			this.messages = data.map(msg => ({
				key: msg.Id,
				value: msg.Message__c,
				label: msg.Name
			}));
		} else if (error) {
			console.error('Error fetching messages:', error);
		}
	}
	handleAccountChange(event) {
		const selectedAccountId = event.target.value;
		this.selectedAccount = selectedAccountId;

		const selectedAccountData = this.accountOptions.find(option => option.value === selectedAccountId);
		let selectedAccountDetails = '';

		if (selectedAccountData) {
			selectedAccountDetails += `Nom: ${selectedAccountData.label}\n`;
			selectedAccountDetails += `Phone: ${selectedAccountData.phone}\n`;
			selectedAccountDetails += `Mail: ${selectedAccountData.mail}\n`;
		} else {
		}

		this.selectedCompte = selectedAccountDetails;
	}
	deleteselectedContact() {
		const selectedContactId = this.selectedAccount; 

		// Filtrer accountOptions pour supprimer le contact sélectionné
		this.accountOptions = this.accountOptions.filter(option => option.value !== selectedContactId);

		// Réinitialiser les détails du contact sélectionné
		this.selectedAccount = '';
		this.selectedCompte = '';
		if (this.accountOptions.length > 0 || this.toNumbers) {
			this.nextStepButtonMessage = false;
		} else {
			this.nextStepButtonMessage = true;
		}
		if (!this.nextStepButtonMessage) {
			this.showIcon = true;
		} else {
			this.showIcon = false;
		}
	}
	get totalAccounts() {
		return this.accountOptions.length;
	}

	// Méthode pour supprimer un numéro ajouté
	removeNumber(event) {
		const numberToRemove = event.target.dataset.number;
		this.addedNumbers = this.addedNumbers.filter(number => number !== numberToRemove);
		this.toNumbers = this.addedNumbers.join(', '); // Mettre à jour la liste des numéros affichés
	}
	//
	handleToNumberChange(event) {
		const cursorPosition = event.target.selectionStart; // Obtient la position du curseur dans le champ de texte
		let toNumbers = event.target.value;

		// Vérifie si une virgule vient d'être ajoutée à la position du curseur
		if (toNumbers[cursorPosition - 1] === ',' && event.inputType === 'insertText') {
			// Insère un saut de ligne après la virgule
			toNumbers = toNumbers.slice(0, cursorPosition) + '\n' + toNumbers.slice(cursorPosition);
			// Met à jour la valeur du champ de texte avec le nouveau texte
			event.target.value = toNumbers;
			// Rétablit la position du curseur après la virgule
			event.target.setSelectionRange(cursorPosition + 1, cursorPosition + 1);
		}

		// Met à jour la propriété de classe avec la nouvelle valeur du champ de texte
		this.toNumbers = toNumbers;

		const toNumbersInput = this.template.querySelector('[data-id="toNumbers"]');
		if (this.toNumbers) {
			this.nextStepButtonMessage = false;
			toNumbersInput.setCustomValidity('');
			toNumbersInput.reportValidity();
		} else {
			this.nextStepButtonMessage = true;
		}

		if (!this.nextStepButtonMessage) {
			this.showIcon = true;
		} else {
			this.showIcon = false;
		}
	}

	calculateNumMessages(length) {
		if (length === 0) {
			return 1;
		}

		for (let i = 0; i < this.MAX_CHARS_PER_SMS.length; i++) {
			if (length <= this.MAX_CHARS_PER_SMS[i]) {
				return i + 1;
			}
		}

		return this.MAX_CHARS_PER_SMS.length;
	}

	calculateRemainingCharacters(length) {
		const totalMaxChars = 612; // Toujours calculer sur 612 caractères
		return totalMaxChars - length;
	}


	get messageLength() {
		return this.message.length;
	}
	handleMessageChange(event) {

		this.message = event.target.value;
		const messageLength = this.message.length;

		this.numMessages = this.calculateNumMessages(messageLength);
		this.remainingCharacters = this.calculateRemainingCharacters(messageLength);

		const messageInput = this.template.querySelector('[data-id="messageInput"]');
		messageInput.setCustomValidity('');
		if (this.message) {
			this.nextStepButtonEnvoi = false;
		} else {
			this.nextStepButtonEnvoi = true;
		}
	}
	selectMessage(event) {
		const selectedValue = event.target.value;
		this.selectedMessageValue = selectedValue;
	}
	handleSaveMessageChange(event) {
		this.isSaveMessage = event.target.checked;

	}
	handleTitleChange(event) {
		this.predefinedMessageTitle = event.target.value;
	}
	sendMessage() {
		const toNumbersInput = this.template.querySelector('[data-id="toNumbers"]');
		const messageInput = this.template.querySelector('[data-id="messageInput"]');

		if (this.toNumbers !== '') {
			let numbersArray = this.toNumbers.split(',');
			let isValid = numbersArray.every(number => {
				let trimmedNumber = number.trim();
				return trimmedNumber.startsWith('+') && !trimmedNumber.endsWith('+');
			});

			if (!isValid) {
				this.inputValid = true;
				return;
			} else {
				this.inputValid = false; // Réinitialise la validité personnalisée
			}
		}

		// Vérifier si l'input est vide avant d'afficher l'erreur
		if (this.toNumbers === '' && this.accountOptions.length === 0) {
			this.errornumberVide = true;
			return;
		} else {
			this.errornumberVide = false;
		}
		if (!messageInput.value || !messageInput.value && this.accountOptions.length > 0) {
			this.errorMessage = true;
			return;
		} else {
			this.errorMessage = false;
		}

		this.isModalOpen = true;
	}


	unconfirmeSave = () => {
		this.confirmSend();
	}

	confirmSave = () => {
		this.isSaveMessage = true;
		this.choicefinish = true;
	}
	login() {
		const isValid = [...this.template.querySelectorAll('lightning-input')].reduce((validSoFar, inputCmp) => {
			inputCmp.reportValidity();
			return validSoFar && inputCmp.checkValidity();
		}, true);

		if (isValid) {
			this.isLoading1 = true;
			validateB2smsCredentials({
					username: this.username,
					password: this.password
				})
				.then(result => {
					if (result.valid) {
						this.xSmsCredit = result.headers['X-SMS-Credit'];
						this.isLoading1 = false;
						this.isLoginModalOpen = false;
					} else {
						this.isLoading1 = false;
						this.error = true;
					}

				})
				.catch(error => {});

		}
	}
	handleUsernameChange(event) {
		this.username = event.target.value;
	}

	handlePasswordChange(event) {
		this.password = event.target.value;
	}
	combineDateTimeISO8601(date, time) {
		if (!date || !time) {
			return null;
		}
		const combinedDateTime = new Date(`${date}T${time}`);
		return combinedDateTime.toISOString();
	}
	confirmSend() {
		this.isLoading2 = true;
		const combinedDateTime = this.combineDateTimeISO8601(this.dateValue, this.timeValue);
		const accountPhoneNumbers = this.accountOptions
			.map(option => option.phone)
			.filter(phone => phone)
			.join(',');

		const accountNames = this.accountOptions
			.map(option => option.label || 'Non spécifié')
			.join(',');

		// Add manually entered phone numbers
		let allPhoneNumbers = accountPhoneNumbers;
		if (this.toNumbers) {
			allPhoneNumbers = allPhoneNumbers ? `${allPhoneNumbers},${this.toNumbers}` : this.toNumbers;
		}

		// Handle phone numbers and associated names from manually entered inputs
		const manualNumbers = this.toNumbers.split(',').map(number => number.trim()).filter(number => number.length > 0);
		const manualNames = manualNumbers.map(() => 'Inconnu');
		// Combine phone numbers and names from both sources
		const toNumbersList = allPhoneNumbers
			.split(',')
			.map(number => number.trim())
			.filter(number => number.length > 0);

		const toNamesList = [...(accountNames ? accountNames.split(',') : []), ...manualNames]
			.map(name => name.trim());
		if (toNumbersList.length > 0 && this.message) {
			sendBulkSMS({
					listNumber: toNumbersList,
					listContacts: toNamesList,
					message: this.message,
					saveMessage: this.isSaveMessage,
					predefinedMessageTitle: this.predefinedMessageTitle,
					USERNAME: this.username,
					pwd: this.password,
					combinedDateTime: combinedDateTime,
					tonameCampagne: this.tonameCampagne
				})
				.then(result => {
					this.isLoading2 = false;
					if (result && result.length > 0) {
						this.isLoading2 = false;
					} else {
						this.isLoading2 = false;
					}
					location.reload();
				})
				.catch(error => {
					this.isLoading2 = false;
					location.reload();
				});
		} else {
			this.isLoading2 = false;
		}
	}
	closeModal() {
		this.isModalOpen = false;
		this.choicefinish = false;
		this.isSaveMessage = false;
	}

	addPredefinedMessage() {

		if (this.selectedMessageValue) {
			this.message = this.selectedMessageValue;
			this.remainingCharacters = 612 - this.message.length;
			this.numMessages = this.calculateNumMessages(this.message.length);
			// Mettre à jour la valeur de l'input du message
			const messageInput = this.template.querySelector('[data-id="messageInput"]');
			if (messageInput) {
				messageInput.value = this.message;
				this.nextStepButtonEnvoi = false;

				// Activer l'onglet "Message Libre"
				this.activeTabValue = 'messageLibre';
				this.addingMessage = true;
			}

		} else {
		}
	}
	handlePredefinedTabClick() {
	
		if (!this.addingMessage) {
			this.activeTabValue = 'predefinedMessages';
		}
		this.addingMessage = false;
	}
	deletePredefinedMessage() {
		if (this.selectedMessageValue) {
			const messageToDelete = this.messages.find(msg => msg.value === this.selectedMessageValue);
			if (messageToDelete) {
				this.isLoading2 = true;
				deleteMessageById({
						messageId: messageToDelete.key
					})
					.then(() => {
						this.messages = this.messages.filter(msg => msg.key !== messageToDelete.key);
						this.selectedMessageValue = '';
						this.isLoading2 = false;
					})
					.catch(error => {
						this.isLoading2 = false;
					});
			} else {}
		} else {}
	}
	logOut() {
		this.isLoading2 = true;
		logOut()
			.then(result => {
				this.isLoading2 = false;
				if (result) {
					this.isLoginModalOpen = true;
					this.error = false;
				} else {}
			})
			.catch(error => {
				this.isLoading2 = false;
			});
	}
	errornumbervideOk() {
		this.errornumberVide = false;
	}
	errormessageOk() {
		this.errorMessage = false;
	}
	inputValidOk() {
		this.inputValid = false;
	}


}