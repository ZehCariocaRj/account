const pythonStruct = require('python-struct');
const bcrypt = require('bcryptjs');
const randtoken = require('rand-token');
const crypto = require('crypto');
const constants = require('./constants');
const database = require('./db');

function genNEXPassoword() {
	const output = [];
	const character = () => {
		const offset = Math.floor(Math.random() * 62);
		if (offset < 10) return offset;
		if (offset < 36) return String.fromCharCode(offset + 55);
		return String.fromCharCode(offset + 61);
	};

	while (output.length < 16) {
		output.push(character());
	}

	return output.join('');
}

async function generatePID() {
	// Quick, dirty fix for PIDs
	const pid = Math.floor(Math.random() * (4294967295 - 1000000000) + 1000000000);
	const does_pid_inuse = await database.user_collection.findOne({
		pid: pid
	});

	if (does_pid_inuse) {
		return await generatePID();
	}

	return pid;
}

function generateRandID(length = 10) {
	let id = '';

	for (let i=0;i<length;i++) {
		id += constants.PID_SORT_LIST.charAt(Math.floor(Math.random() * constants.PID_SORT_LIST.length));
	}

	return id;
}

async function generateEmailToken() {
	const token = randtoken.generate(32);
	const user = await database.user_collection.findOne({
		'sensitive.email_confirms.token': token
	});
		
	if (user) {
		return await generateEmailToken();
	}

	return token;
}

async function generateEmailCode() {
	const code = generateRandID(6);
	const user = await database.user_collection.findOne({
		'sensitive.email_confirms.code': code
	});
		
	if (user) {
		return await generateEmailCode();
	}

	return code;
}

function generateNintendoHashedPWrd(password, pid) {
	const buff1 = pythonStruct.pack('<I', pid);
	const buff2 = Buffer.from(password).toString('ascii');

	const unpacked = new Buffer(bufferToHex(buff1) + '\x02eCF' + buff2, 'ascii');
	const hashed = crypto.createHash('sha256').update(unpacked).digest().toString('hex');

	return hashed;
}

function bufferToHex(buff) {
	let result = '';
	const arr = buff.toString('hex').match(/.{1,2}/g);
	for (let i=0;i<arr.length;i++) {
		const char = arr[i];
		result += String.fromCharCode(parseInt(char, 16));
	}
	result.replace(/\\/g, '&#92;');
	return result;
}

async function doesUserExist(username) {
	const user = await database.user_collection.findOne({
		user_id_flat: username.toLowerCase()
	});
		
	if (user !== null) {
		return true;
	}

	return false;
}

async function getUser(token) {
	const user = await database.user_collection.findOne({
		'sensitive.tokens.access.token': token
	});
		
	if (user) {
		return user;
	}

	return null;
}

async function getUserBasic(token, email) {
	const unpacked_token = Buffer.from(token, 'base64').toString().split(' ');
	const user = await database.user_collection.findOne({
		user_id_flat: unpacked_token[0].toLowerCase()
	});

	if (!user) {
		return null;
	}

	if (user.email.address.address !== email) {
		return null;
	}

	const hashed_password = generateNintendoHashedPWrd(unpacked_token[1], user.pid);


	if (!bcrypt.compareSync(hashed_password, user.sensitive.password)) {
		return null;
	}

	return user;
}

function generateAccessToken(payload) {
	const token = crypto.createHash('md5').update(JSON.stringify(payload)).digest('hex');

	return token;
}

function generateRefreshToken(payload) {
	const token = crypto.createHash('md5').update(JSON.stringify(payload)).digest('hex');

	return token;
}

function mapUser(user) {
	const accounts = [];
	const device_attributes = [];

	user.accounts.forEach(account => {
		account = account.account;
		const attributes = [];

		account.attributes.forEach(attribute => {
			attribute = attribute.attribute;
			attributes.push({
				attribute: {
					id: attribute.id,
					name: attribute.name,
					updated_by: attribute.updated_by,
					value: attribute.value,
				}
			});
		});

		accounts.push({
			account: {
				attributes: attributes,
				domain: account.domain,
				type: account.type,
				username: account.username
			}
		});
	});

	user.device_attributes.device_attribute.forEach(device_attribute => {
		const attribute = {
			name: device_attribute.name,
			value: device_attribute.value
		};

		if (device_attribute.created_date) {
			attribute.created_date = device_attribute.created_date;
		}

		device_attributes.push({
			device_attribute: attribute
		});
	});

	const person = {
		person: {
			accounts: accounts,
			active_flag: user.active_flag,
			birth_date: user.birth_date,
			country: user.country,
			create_date: user.create_date,
			device_attributes: device_attributes,
			gender: user.gender,
			language: user.language,
			updated: user.updated,
			marketing_flag: user.marketing_flag,
			off_device_flag: user.off_device_flag,
			pid: user.pid,
			email: {
				address: user.email.address.address,
				id: user.email.id,
				parent: user.email.address.parent,
				primary: user.email.address.primary,
				reachable: user.email.reachable,
				type: user.email.address.type,
				updated_by: user.email.updated_by,
				validated: user.email.address.validated,
				validated_date: user.updated
			},
			mii: {
				status: user.mii.status,
				data: user.mii.data.replace('\r\n', ''),
				id: user.mii.id,
				mii_hash: user.mii.mii_hash,
				mii_images: [
					{
						mii_image: {
							cached_url: user.mii.mii_images[0].cached_url,
							id: user.mii.mii_images[0].id,
							url: user.mii.mii_images[0].url,
							type: user.mii.mii_images[0].type
						}
					}
				],
				name: user.mii.name,
				primary: user.mii.primary
			},
			region: user.region,
			tz_name: user.tz_name,
			user_id: user.user_id,
			utc_offset: user.utc_offset
		}
	};

	return person;
}


module.exports = {
	genNEXPassoword: genNEXPassoword,
	generatePID: generatePID,
	generateRandID: generateRandID,
	generateNintendoHashedPWrd: generateNintendoHashedPWrd,
	doesUserExist: doesUserExist,
	generateAccessToken: generateAccessToken,
	generateRefreshToken: generateRefreshToken,
	getUser: getUser,
	getUserBasic: getUserBasic,
	mapUser: mapUser,
	generateEmailToken: generateEmailToken,
	generateEmailCode: generateEmailCode,
};