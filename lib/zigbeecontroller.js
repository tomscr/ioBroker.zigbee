'use strict';

const pathLib = require('path');
const ZigbeeHerdsman = require('zigbee-herdsman');
const zigbeeHerdsmanConverters = require('zigbee-herdsman-converters');
const EventEmitter = require('events').EventEmitter;
const safeJsonStringify = require('./json');
const DeviceAvailabilityExt = require('./zbDeviceAvailability');
const DeviceConfigureExt = require('./zbDeviceConfigure');
const DeviceEventExt = require('./zbDeviceEvent');
const DelayedActionExt = require('./zbDelayedAction');
const groupConverters = [
    zigbeeHerdsmanConverters.toZigbeeConverters.light_onoff_brightness,
    zigbeeHerdsmanConverters.toZigbeeConverters.light_colortemp,
    zigbeeHerdsmanConverters.toZigbeeConverters.light_color,
    zigbeeHerdsmanConverters.toZigbeeConverters.light_alert,
    zigbeeHerdsmanConverters.toZigbeeConverters.ignore_transition,
    zigbeeHerdsmanConverters.toZigbeeConverters.light_brightness_move,
    zigbeeHerdsmanConverters.toZigbeeConverters.light_brightness_step,
    zigbeeHerdsmanConverters.toZigbeeConverters.light_colortemp_move,
    zigbeeHerdsmanConverters.toZigbeeConverters.light_colortemp_step,
    zigbeeHerdsmanConverters.toZigbeeConverters.ight_colortemp_startup
];
const {ZnpCommandStatus, NvSystemIds, NvItemsIds} = require('zigbee-herdsman/dist/adapter/z-stack/constants/common');
const {ZnpVersion} = require('zigbee-herdsman/dist/adapter/z-stack/adapter/tstype');
const {AdapterNvMemory} = require('zigbee-herdsman/dist/adapter/z-stack/adapter/adapter-nv-memory');
const Structs = require("zigbee-herdsman/dist/adapter/z-stack/structs");


const znpBackupItems = {
    // Introduced by zigbeer/zigbee-shepherd and now used by Zigbee2MQTT
    'HAS_CONFIGURED_ZSTACK1': NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK1,
    'HAS_CONFIGURED_ZSTACK3': NvItemsIds.ZNP_HAS_CONFIGURED_ZSTACK3,
    // OSAL NV item IDs
    'EXTADDR': NvItemsIds.EXTADDR,
    'BOOTCOUNTER': NvItemsIds.BOOTCOUNTER,
    'STARTUP_OPTION': NvItemsIds.STARTUP_OPTION,
    'START_DELAY': NvItemsIds.START_DELAY,
    // # NWK Layer NV item IDs
    'NIB': NvItemsIds.NIB,
    'DEVICE_LIST': NvItemsIds.DEVICE_LIST,
    'ADDRMGR': NvItemsIds.ADDRMGR,
    'POLL_RATE_OLD16': NvItemsIds.POLL_RATE_OLD16,
    'QUEUED_POLL_RATE': NvItemsIds.QUEUED_POLL_RATE,
    'RESPONSE_POLL_RATE': NvItemsIds.RESPONSE_POLL_RATE,
    'REJOIN_POLL_RATE': NvItemsIds.REJOIN_POLL_RATE,
    'DATA_RETRIES': NvItemsIds.DATA_RETRIES,
    'POLL_FAILURE_RETRIES': NvItemsIds.POLL_FAILURE_RETRIES,
    'STACK_PROFILE': NvItemsIds.STACK_PROFILE,
    'INDIRECT_MSG_TIMEOUT': NvItemsIds.INDIRECT_MSG_TIMEOUT,
    'ROUTE_EXPIRY_TIME': NvItemsIds.ROUTE_EXPIRY_TIME,
    'EXTENDED_PAN_ID': NvItemsIds.EXTENDED_PAN_ID,
    'BCAST_RETRIES': NvItemsIds.BCAST_RETRIES,
    'PASSIVE_ACK_TIMEOUT': NvItemsIds.PASSIVE_ACK_TIMEOUT,
    'BCAST_DELIVERY_TIME': NvItemsIds.BCAST_DELIVERY_TIME,
    'NWK_MODE': NvItemsIds.NWK_MODE,
    'CONCENTRATOR_ENABLE': NvItemsIds.CONCENTRATOR_ENABLE,
    'CONCENTRATOR_DISCOVERY': NvItemsIds.CONCENTRATOR_DISCOVERY,
    'CONCENTRATOR_RADIUS': NvItemsIds.CONCENTRATOR_RADIUS,
    'POLL_RATE': NvItemsIds.POLL_RATE,
    'CONCENTRATOR_RC': NvItemsIds.CONCENTRATOR_RC,
    'NWK_MGR_MODE': NvItemsIds.NWK_MGR_MODE,
    'SRC_RTG_EXPIRY_TIME': NvItemsIds.SRC_RTG_EXPIRY_TIME,
    'ROUTE_DISCOVERY_TIME': NvItemsIds.ROUTE_DISCOVERY_TIME,
    'NWK_ACTIVE_KEY_INFO': NvItemsIds.NWK_ACTIVE_KEY_INFO,
    'NWK_ALTERN_KEY_INFO': NvItemsIds.NWK_ALTERN_KEY_INFO,
    'ROUTER_OFF_ASSOC_CLEANUP': NvItemsIds.ROUTER_OFF_ASSOC_CLEANUP,
    'NWK_LEAVE_REQ_ALLOWED': NvItemsIds.NWK_LEAVE_REQ_ALLOWED,
    'NWK_CHILD_AGE_ENABLE': NvItemsIds.NWK_CHILD_AGE_ENABLE,
    'DEVICE_LIST_KA_TIMEOUT': NvItemsIds.DEVICE_LIST_KA_TIMEOUT,
    // APS Layer NV item IDs
    'BINDING_TABLE': NvItemsIds.BINDING_TABLE,
    'GROUP_TABLE': NvItemsIds.GROUP_TABLE,
    'APS_FRAME_RETRIES': NvItemsIds.APS_FRAME_RETRIES,
    'APS_ACK_WAIT_DURATION': NvItemsIds.APS_ACK_WAIT_DURATION,
    'APS_ACK_WAIT_MULTIPLIER': NvItemsIds.APS_ACK_WAIT_MULTIPLIER,
    'BINDING_TIME': NvItemsIds.BINDING_TIME,
    'APS_USE_EXT_PANID': NvItemsIds.APS_USE_EXT_PANID,
    'APS_USE_INSECURE_JOIN': NvItemsIds.APS_USE_INSECURE_JOIN,
    'COMMISSIONED_NWK_ADDR': NvItemsIds.COMMISSIONED_NWK_ADDR,
    'APS_NONMEMBER_RADIUS': NvItemsIds.APS_NONMEMBER_RADIUS,
    'APS_LINK_KEY_TABLE': NvItemsIds.APS_LINK_KEY_TABLE,
    'APS_DUPREJ_TIMEOUT_INC': NvItemsIds.APS_DUPREJ_TIMEOUT_INC,
    'APS_DUPREJ_TIMEOUT_COUNT': NvItemsIds.APS_DUPREJ_TIMEOUT_COUNT,
    'APS_DUPREJ_TABLE_SIZE': NvItemsIds.APS_DUPREJ_TABLE_SIZE,
    // System statistics and metrics NV ID
    'DIAGNOSTIC_STATS': NvItemsIds.DIAGNOSTIC_STATS,
    // Additional NWK Layer NV item IDs
    'NWK_PARENT_INFO': NvItemsIds.NWK_PARENT_INFO,
    'NWK_ENDDEV_TIMEOUT_DEF': NvItemsIds.NWK_ENDDEV_TIMEOUT_DEF,
    'END_DEV_TIMEOUT_VALUE': NvItemsIds.END_DEV_TIMEOUT_VALUE,
    'END_DEV_CONFIGURATION': NvItemsIds.END_DEV_CONFIGURATION,
    'BDBNODEISONANETWORK': NvItemsIds.BDBNODEISONANETWORK,
    'BDBREPORTINGCONFIG': NvItemsIds.BDBREPORTINGCONFIG,
    // Security NV Item IDs
    'SECURITY_LEVEL': NvItemsIds.SECURITY_LEVEL,
    'PRECFGKEY': NvItemsIds.PRECFGKEY,
    'PRECFGKEYS_ENABLE': NvItemsIds.PRECFGKEYS_ENABLE,
    'SECURITY_MODE': NvItemsIds.SECURITY_MODE,
    'SECURE_PERMIT_JOIN': NvItemsIds.SECURE_PERMIT_JOIN,
    'APS_LINK_KEY_TYPE': NvItemsIds.APS_LINK_KEY_TYPE,
    'APS_ALLOW_R19_SECURITY': NvItemsIds.APS_ALLOW_R19_SECURITY,
    'DISTRIBUTED_KEY': NvItemsIds.DISTRIBUTED_KEY,
    'IMPLICIT_CERTIFICATE': NvItemsIds.IMPLICIT_CERTIFICATE,
    'DEVICE_PRIVATE_KEY': NvItemsIds.DEVICE_PRIVATE_KEY,
    'CA_PUBLIC_KEY': NvItemsIds.CA_PUBLIC_KEY,
    'KE_MAX_DEVICES': NvItemsIds.KE_MAX_DEVICES,
    'USE_DEFAULT_TCLK': NvItemsIds.USE_DEFAULT_TCLK,
    'RNG_COUNTER': NvItemsIds.RNG_COUNTER,
    'RANDOM_SEED': NvItemsIds.RANDOM_SEED,
    'TRUSTCENTER_ADDR': NvItemsIds.TRUSTCENTER_ADDR,
    'CERT_283': NvItemsIds.CERT_283,
    'PRIVATE_KEY_283': NvItemsIds.PRIVATE_KEY_283,
    'PUBLIC_KEY_283': NvItemsIds.PUBLIC_KEY_283,
    'LEGACY_NWK_SEC_MATERIAL_TABLE_START': NvItemsIds.LEGACY_NWK_SEC_MATERIAL_TABLE_START,
    'LEGACY_NWK_SEC_MATERIAL_TABLE_END': NvItemsIds.LEGACY_NWK_SEC_MATERIAL_TABLE_END,
    // ZDO NV Item IDs
    'USERDESC': NvItemsIds.USERDESC,
    'NWKKEY': NvItemsIds.NWKKEY,
    'PANID': NvItemsIds.PANID,
    'CHANLIST': NvItemsIds.CHANLIST,
    'LEAVE_CTRL': NvItemsIds.LEAVE_CTRL,
    'SCAN_DURATION': NvItemsIds.SCAN_DURATION,
    'LOGICAL_TYPE': NvItemsIds.LOGICAL_TYPE,
    'NWKMGR_MIN_TX': NvItemsIds.NWKMGR_MIN_TX,
    'NWKMGR_ADDR': NvItemsIds.NWKMGR_ADDR,
    'ZDO_DIRECT_CB': NvItemsIds.ZDO_DIRECT_CB,
    // ZCL NV item IDs
    'SCENE_TABLE': NvItemsIds.SCENE_TABLE,
    'MIN_FREE_NWK_ADDR': NvItemsIds.MIN_FREE_NWK_ADDR,
    'MAX_FREE_NWK_ADDR': NvItemsIds.MAX_FREE_NWK_ADDR,
    'MIN_FREE_GRP_ID': NvItemsIds.MIN_FREE_GRP_ID,
    'MAX_FREE_GRP_ID': NvItemsIds.MAX_FREE_GRP_ID,
    'MIN_GRP_IDS': NvItemsIds.MIN_GRP_IDS,
    'MAX_GRP_IDS': NvItemsIds.MAX_GRP_IDS,
    'OTA_BLOCK_REQ_DELAY': NvItemsIds.OTA_BLOCK_REQ_DELAY,
    // Non-standard NV item IDs
    'SAPI_ENDPOINT': NvItemsIds.SAPI_ENDPOINT,
    // NV Items Reserved for Commissioning Cluster Startup Attribute Set (SAS):
    // 0x00B1 - 0x00BF: Parameters related to APS and NWK layers
    'SAS_SHORT_ADDR': NvItemsIds.SAS_SHORT_ADDR,
    'SAS_EXT_PANID': NvItemsIds.SAS_EXT_PANID,
    'SAS_PANID': NvItemsIds.SAS_PANID,
    'SAS_CHANNEL_MASK': NvItemsIds.SAS_CHANNEL_MASK,
    'SAS_PROTOCOL_VER': NvItemsIds.SAS_PROTOCOL_VER,
    'SAS_STACK_PROFILE': NvItemsIds.SAS_STACK_PROFILE,
    'SAS_STARTUP_CTRL': NvItemsIds.SAS_STARTUP_CTRL,
    // 0x00C1 - 0x00CF: Parameters related to Security
    'SAS_TC_ADDR': NvItemsIds.SAS_TC_ADDR,
    'SAS_TC_MASTER_KEY': NvItemsIds.SAS_TC_MASTER_KEY,
    'SAS_NWK_KEY': NvItemsIds.SAS_NWK_KEY,
    'SAS_USE_INSEC_JOIN': NvItemsIds.SAS_USE_INSEC_JOIN,
    'SAS_PRECFG_LINK_KEY': NvItemsIds.SAS_PRECFG_LINK_KEY,
    'SAS_NWK_KEY_SEQ_NUM': NvItemsIds.SAS_NWK_KEY_SEQ_NUM,
    'SAS_NWK_KEY_TYPE': NvItemsIds.SAS_NWK_KEY_TYPE,
    'SAS_NWK_MGR_ADDR': NvItemsIds.SAS_NWK_MGR_ADDR,
    // 0x00D1 - 0x00DF: Current key parameters
    'SAS_CURR_TC_MASTER_KEY': NvItemsIds.SAS_CURR_TC_MASTER_KEY,
    'SAS_CURR_NWK_KEY': NvItemsIds.SAS_CURR_NWK_KEY,
    'SAS_CURR_PRECFG_LINK_KEY': NvItemsIds.SAS_CURR_PRECFG_LINK_KEY,

    //'USE_NVOCMP': NvItemsIds.USE_NVOCMP,
    // NV Items Reserved for Trust Center Link Key Table entries
    // 0x0101 - 0x01FF
    'TCLK_SEED': NvItemsIds.TCLK_SEED,
    //'TCLK_JOIN_DEV': NvItemsIds.TCLK_JOIN_DEV,
    //'TCLK_DEFAULT': NvItemsIds.TCLK_DEFAULT,
    //'LEGACY_TCLK_IC_TABLE_START': NvItemsIds.
    //'LEGACY_TCLK_IC_TABLE_END': NvItemsIds.
    //'LEGACY_TCLK_TABLE_START'
    //'LEGACY_TCLK_TABLE_END'
    // NV Items Reserved for APS Link Key Table entries
    // 0x0201 - 0x02FF
    'LEGACY_APS_LINK_KEY_DATA_START': NvItemsIds.APS_LINK_KEY_DATA_START,
    'LEGACY_APS_LINK_KEY_DATA_END': NvItemsIds.APS_LINK_KEY_DATA_END,
    // NV items used to duplicate system elements
    'DUPLICATE_BINDING_TABLE': NvItemsIds.DUPLICATE_BINDING_TABLE,
    'DUPLICATE_DEVICE_LIST': NvItemsIds.DUPLICATE_DEVICE_LIST,
    'DUPLICATE_DEVICE_LIST_KA_TIMEOUT': NvItemsIds.DUPLICATE_DEVICE_LIST_KA_TIMEOUT,
    // NV Items Reserved for Proxy Table entries
    // 0x0310 - 0x031F
    //'LEGACY_PROXY_TABLE_START'
    //'LEGACY_PROXY_TABLE_END'
    // NV Items Reserved for Sink Table entries
    // 0x0320 - 0x032F
    //'LEGACY_SINK_TABLE_START'
    //'LEGACY_SINK_TABLE_END'
    // 'APP_ITEM_1'
    // 'APP_ITEM_2'
    // 'APP_ITEM_3'
    // 'APP_ITEM_4'
    // 'APP_ITEM_5'
    // 'APP_ITEM_6'
};

const znpBackupTables = {
    'LEGACY_NWK_SEC_MATERIAL_TABLE_START': 'LEGACY_NWK_SEC_MATERIAL_TABLE_END',
    'LEGACY_APS_LINK_KEY_DATA_START': 'LEGACY_APS_LINK_KEY_DATA_END',
};


function isFunction(functionToCheck) {
    return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}

class ZigbeeController extends EventEmitter {
    /*
      events:

      log - log (level, msg, data)
      event - preparsed device events (type, dev, msg, data)
      new - new device connected to network (id, msg)
      leave - device leave the network (id, msg)
      join - join countdown (counter)
      ready - connection successfull ()
    */
    constructor(adapter) {
        super();
        this.adapter = adapter;
        this._permitJoinTime = 0;
        this.herdsman_started = false;
        this.extensions = [
            new DeviceAvailabilityExt(this, {}),
            new DeviceConfigureExt(this, {}),
            new DeviceEventExt(this, {}),
            new DelayedActionExt(this, {}),
        ];
    }

    configure(options) {
        const herdsmanSettings = {
            network: {
                panID: options.net.panId,
                extendedPanID: options.net.extPanId,
                channelList: options.net.channelList,
                networkKey: options.net.precfgkey,
            },
            databasePath: pathLib.join(options.dbDir, options.dbPath),
            backupPath: pathLib.join(options.dbDir, options.backupPath),
            serialPort: {
                baudRate: options.sp.baudRate,
                rtscts: options.sp.rtscts,
                path: options.sp.port,
                adapter: options.sp.adapter,
            },
            adapter: {
                forceStartWithInconsistentAdapterConfiguration: options.startWithInconsistent
            },
        };
        // https://github.com/ioBroker/ioBroker.zigbee/issues/668
        if (!options.extPanIdFix) {
            delete herdsmanSettings.network.extendedPanID;
            herdsmanSettings.network.extenedPanID = options.net.extPanId;
        }

        if (options.transmitPower == undefined) {
            this.transmitPower = 0;
        } else {
            this.transmitPower = options.transmitPower;
        }
        this.disableLed = options.disableLed;

        this.debug(`Using zigbee-herdsman with settings: ${JSON.stringify(herdsmanSettings)}`);
        this.herdsman = new ZigbeeHerdsman.Controller(herdsmanSettings, this.adapter.log);
        this.callExtensionMethod('setOptions', [{ disableActivePing: options.disablePing, disableForcedPing: false, pingTimeout:300, pingCount:3 }] );
    }

    // Start controller
    async start() {
        try {
            this.warn(this.extensions.length + "  extensions initialized ");
            this.extensions.forEach(item => { this.warn ("extension " + item.name); });
            //this.debug(`Using zigbee-herdsman with settings2: ${JSON.stringify(this)}`);
            this.debug(`Starting zigbee-herdsman...`);
            await this.herdsman.start();

            this.herdsman.on('adapterDisconnected', this.handleDisconnected.bind(this));
            this.herdsman.on('deviceAnnounce', this.handleDeviceAnnounce.bind(this));
            this.herdsman.on('deviceInterview', this.handleDeviceInterview.bind(this));
            this.herdsman.on('deviceJoined', this.handleDeviceJoined.bind(this));
            this.herdsman.on('deviceLeave', this.handleDeviceLeave.bind(this));
            this.herdsman.on('message', this.handleMessage.bind(this));

            this.debug('zigbee-herdsman started');
            this.herdsman_started = true;
            this.info(`Coordinator firmware version: ${JSON.stringify(await this.herdsman.getCoordinatorVersion())}`);

            // debug info from herdsman getNetworkParameters
            const debNetworkParam = JSON.parse(JSON.stringify(await this.herdsman.getNetworkParameters()));
            const extendedPanIDDebug = (typeof debNetworkParam.extendedPanID == 'string') ? debNetworkParam.extendedPanID.replace('0x','') : debNetworkParam.extendedPanID;

            let extPanIDDebug = '';
            for (let i = extendedPanIDDebug.length - 1; i >= 0; i--) {
                extPanIDDebug += extendedPanIDDebug[i-1];
                extPanIDDebug += extendedPanIDDebug[i];
                i--;
            }

            this.debug(`Zigbee network parameters: panID=${debNetworkParam.panID} channel=${debNetworkParam.channel} extendedPanID=${extPanIDDebug}`);
            this.readAllNvMemItems();

        } catch (e) {
            this.sendError(e);
            this.error('Starting zigbee-herdsman problem : ' + JSON.stringify(e.message));
            throw 'Error herdsman start';
        }
        // Check if we have to turn off the led
        try {
            if (this.disableLed) {
                this.info('Disable LED');
                await this.herdsman.setLED(false);
            } else {
                await this.herdsman.setLED(true);
            }
        } catch (e) {
            this.info('Unable to disable LED, unsupported function.');
            this.sendError(e);
        }

        // only for CC1352P and CC26X2R1 transmit power
        let powerText = 'normal';

        if (this.transmitPower != '0') {
            switch(this.transmitPower) {
                case '-22':
                    powerText = 'low';
                    break;
                case '19':
                    powerText = 'high';
                    break;
                case '20':
                    powerText = 'high+';
                    break;                    
                default:
                    powerText = 'normal';
            }
        }


        this.info('  --> transmitPower : ' + powerText);
        try {
            await this.herdsman.setTransmitPower(this.transmitPower);
        } catch (e) {
            this.sendError(e);
            this.info('Unable to set transmit power, unsupported function.');
        }


        // Call extensions
        this.callExtensionMethod('onZigbeeStarted', []);

        // Log zigbee clients on startup
        const devices = await this.getClients();
        if (devices.length > 0) {
            this.info(`Currently ${devices.length} devices are joined:`);
        } else {
            this.info(`Currently no devices.`);
        }
        for (const device of devices) {
            const entity = await this.resolveEntity(device);
            // ensure that objects for all found clients are present
            this.callExtensionMethod('registerDevicePing', [device, entity]);

            if (entity.mapped) this.emit('new', entity);
            this.info(
                (entity.device.ieeeAddr) +
                ` (addr ${entity.device.networkAddress}): ` +
                (entity.mapped ?
                    `${entity.mapped.model} - ${entity.mapped.vendor} ${entity.mapped.description} ` :
                    `Not supported (model ${entity.device.modelID})`) +
                `(${entity.device.type})`
            );
        }

        this.emit('ready');
    }

    info(message, data) {
        this.emit('log', 'info', message, data);
    }

    error(message, data) {
        this.emit('log', 'error', message, data);
    }

    debug(message, data) {
        this.emit('log', 'debug', message, data);
    }

    warn(message, data) {
        this.emit('log', 'warn', message, data);
    }

    event(type, dev, message, data) {
        this.emit('event', type, dev, message, data);
    }

    sendError(error, message) {
        this.adapter.sendError(error, message);
    }

    callExtensionMethod(method, parameters) {
        const result = [];
        for (const extension of this.extensions) {
            if (extension[method]) {
                try {
                    if (parameters !== undefined) {
                        result.push(extension[method](...parameters));
                    } else {
                        result.push(extension[method]());
                    }
                } catch (error) {
                    this.sendError(error);
                    this.error(`Failed to call '${extension.constructor.name}' '${method}' (${error.stack})`);
                }
            }
        }
        return Promise.all(result);
    }

    async getClients(all) {
        if (this.herdsman.database) {
            const devices = await this.herdsman.getDevices();
            if (all) {
                return devices;
            } else {
                return devices.filter((device) => device.type !== 'Coordinator');
            }
        } else {
            return [];
        }
    }

    async getGroups() {
        try {
            return this.herdsman.getGroups();
        } catch (error) {
            this.sendError(error);
            return undefined;
        }
    }

    async removeGroupById(id) {
        const group = await  this.getGroupByID(id);
        try {
            if (group) group.removeFromDatabase();
        } catch (error) {
            this.sendError(error);
            this.error('error in removeGroupById: ' + error);
        }
    }

    async getGroupByID(id) {
        try {
            return this.herdsman.getGroupByID(id);
        } catch (error) {
            this.sendError(error);
            return undefined;
        }
    }

    async getGroupMembersFromController(id) {
        const members = [];
        try {
            const group = await this.getGroupByID(id);
            if (group) {
                const groupmembers = group.members;

                for (const member of groupmembers) {
                    const nwk = member.deviceNetworkAddress;
                    const device = this.getDeviceByNetworkAddress(nwk);
                    if (device && device.ieeeAddr) members.push( { device:device.ieeeAddr, model:device.modelID } );
                }
            }
            else {
                return undefined;
            }

        } catch (error) {
            this.sendError(error);
            if (error) this.error('getGroupMembersFromController: error is  ' + JSON.stringify(error) + ' ' + JSON.stringify(new Error().stack));
            else this.error('unidentifed error in getGroupMembersFromController');
        }
        return members;
    }

    getDevice(key) {
        return this.herdsman.getDeviceByIeeeAddr(key);
    }

    getDevicesByType(type) {
        return this.herdsman.getDevicesByType(type);
    }

    getDeviceByNetworkAddress(networkAddress) {
        return this.herdsman.getDeviceByNetworkAddress(networkAddress);
    }

    async resolveEntity(key, ep) {
        //assert(typeof key === 'string' || key.constructor.name === 'Device', `Wrong type '${typeof key}'`);

        if (typeof key === 'string') {
            if (key === 'coordinator') {
                const coordinator = this.herdsman.getDevicesByType('Coordinator')[0];
                return {
                    type: 'device',
                    device: coordinator,
                    endpoint: coordinator.getEndpoint(1),
                    name: 'Coordinator',
                };
            } else {
                const device = await this.herdsman.getDeviceByIeeeAddr(key);
                if (device) {
                    const mapped = zigbeeHerdsmanConverters.findByDevice(device);
                    const endpoints = mapped && mapped.endpoint ? mapped.endpoint(device) : null;
                    let endpoint;
                    if (endpoints && ep != undefined && endpoints[ep]) {
                        endpoint = device.getEndpoint(endpoints[ep]);
                    } else if (endpoints && endpoints['default']) {
                        endpoint = device.getEndpoint(endpoints['default']);
                    } else {
                        const epNum = parseInt(ep);
                        if (!isNaN(epNum)) {
                            endpoint = device.getEndpoint(epNum);
                        } else {
                            endpoint = device.endpoints[0];
                        }
                    }
                    return {
                        type: 'device',
                        device,
                        mapped,
                        endpoint,
                        endpoints: device.endpoints,
                        name: key,
                    };
                } else {
                    return;
                }
            }
        } else if (typeof key === 'number') {
            let group = await this.herdsman.getGroupByID(key);
            if (!group) group = await this.herdsman.createGroup(key);
            group.toZigbee = groupConverters;
            group.model = 'group';
            return {
                type: 'group',
                mapped: group,
                group,
                name: `Group ${key}`,
            };
        } else {
            return {
                type: 'device',
                device: key,
                mapped: zigbeeHerdsmanConverters.findByDevice(key),
                name: key.type === 'Coordinator' ? 'Coordinator' : key.ieeeAddr,
            };
        }
    }

    async incMsgHandler(message){
        this.debug('incoming msg', message);
        const device = await this.herdsman.getDeviceByIeeeAddr(message.srcaddr);
        if (!device) {
            this.debug('Message without device!');
            return;
        }
        // We can't handle devices without modelId.
        if (!device.modelId) {
            this.debug('Message without modelId!');
            return;
        }
        this.event('msg', device.ieeeAddr, message, {
            modelId: device.modelId
        });
    }

    // Stop controller
    async stop() {
        // Call extensions
        await this.callExtensionMethod('stop', []);

        try {
            await this.permitJoin(0);
            await this.herdsman.stop();
        } catch (error) {
            this.sendError(error);
            if (this.herdsman_started)
                this.error(`Failed to stop zigbee (${error.stack})`);
            else {
                this.warn(`Failed to stop zigbee during startup`);
            }
        }
    }

    async handleDisconnected() {
        this.herdsman_started = false;
        this.emit('disconnect');
    }

    connected() {
        return this.herdsman_started;
    }

    // Permit join
    async permitJoin(permitTime, devid, failure) {
        let permitDev;
        if (isFunction(devid) && !isFunction(failure)) {
            failure = devid;
        } else {
            permitDev = this.getDevice(devid);
        }

        if (permitTime) {
            this.info('Zigbee: allowing new devices to join.');
        } else {
            this.info('Zigbee: disabling joining new devices.');
        }
        try
        {
            if (permitTime && !this.herdsman.getPermitJoin()) {
                clearInterval(this._permitJoinInterval);
                this._permitJoinTime = permitTime;
                await this.herdsman.permitJoin(true, permitDev);
                this._permitJoinInterval = setInterval(async () => {
                    this.emit('pairing', 'Pairing time left', this._permitJoinTime);
                    if (this._permitJoinTime === 0) {
                        this.info('Zigbee: stop joining');
                        clearInterval(this._permitJoinInterval);
                        await this.herdsman.permitJoin(false);
                    }
                    this._permitJoinTime -= 1;
                }, 1000);
            } else if (this.herdsman.getPermitJoin()) {
                if (permitTime) {
                    this.info('Joining already permitted');
                } else {
                    clearInterval(this._permitJoinInterval);
                    await this.herdsman.permitJoin(false, permitDev);
                }
            }
        } catch (e) {
            this.sendError(e);
            this.error(`Failed to open the network: ${e.stack}`);
        }
    }

    // Remove device
    async remove(deviceID, force, callback) {
        try {
            const device = await this.herdsman.getDeviceByIeeeAddr(deviceID);
            if (device) {
                try {
                    await this.herdsman.adapter.removeDevice(device.networkAddress, device.ieeeAddr);
                } catch (error) {
                    this.sendError(error);
                    if (error)
                        this.debug(`Failed to remove device ${error.stack}`);
                    // skip error if force
                    if (!force) {
                        throw error;
                    } else {
                        this.debug(`Force remove`);
                    }
                }
                try {
                    await device.removeFromDatabase();
                } catch (error) {
                    this.sendError(error);
                    // skip error
                    if (error)
                        this.debug(`Failed to remove from DB ${error.stack}`);
                }
                this.debug('Remove successful.');
                if (callback) callback();
                this.callExtensionMethod(
                    'onDeviceRemove',
                    [device],
                );
            }
        } catch (error) {
            this.sendError(error);
            this.error(`Failed to remove ${error.stack}`);
            if (callback) callback(`Failed to remove ${error.stack}`);
        }
    }

    // Zigbee events
    async handleDeviceLeave(message) {
        try {
            this.debug('handleDeviceLeave', message);
            const entity = await this.resolveEntity(message.device || message.ieeeAddr);
            const friendlyName = (entity) ? entity.name : message.ieeeAddr;
            this.debug(`Device '${friendlyName}' left the network`);
            this.emit('leave', message.ieeeAddr);
            // Call extensions
            this.callExtensionMethod(
                'onDeviceLeave',
                [message, entity],
            );
        } catch (error) {
            this.sendError(error);
            this.error(`Failed to handleDeviceLeave ${error.stack}`);
        }
    }

    async handleDeviceAnnounce(message) {
        this.debug('handleDeviceAnnounce', message);
        const entity = await this.resolveEntity(message.device || message.ieeeAddr);
        const friendlyName = entity.name;
        this.warn(`Device '${friendlyName}' announced itself`);

        if (entity && entity.mapped) {
            this.callExtensionMethod(
                'onZigbeeEvent',
                [ {'device': message.device, 'type': 'deviceAnnounce'}, (entity ? entity.mapped : null)]);
        }

        this.emit('pairing', `Device '${friendlyName}' announced itself`);
        if (!this.herdsman.getPermitJoin()) this.callExtensionMethod('registerDevicePing', [message.device, entity]);
        // if has modelID so can create device
        if (entity.device && entity.device._modelID) {
            entity.device.modelID = entity.device._modelID;
            this.emit('new', entity);
        }
    }


    async handleDeviceJoined(message) {
        this.debug('handleDeviceJoined', message);
        //const entity = await this.resolveEntity(message.device || message.ieeeAddr);
        //this.emit('new', entity);
    }

    async handleDeviceInterview(message) {
        this.debug('handleDeviceInterview', message);
        // safeguard: We do not allow to start an interview if the network is not opened
        if (message.status === 'started' && !this.herdsman.getPermitJoin()) {
            this.warn(`Blocked interview for '${message.ieeeAddr}' because the network is closed`);
            return;
        }
        const entity = await this.resolveEntity(message.device || message.ieeeAddr);
        const friendlyName = entity.name;
        if (message.status === 'successful') {
            this.info(`Successfully interviewed '${friendlyName}', device has succesfully been paired`);

            if (entity.mapped) {
                const {vendor, description, model} = entity.mapped;
                this.info(
                    `Device '${friendlyName}' is supported, identified as: ${vendor} ${description} (${model})`
                );

                const log = {friendly_name: friendlyName, model, vendor, description, supported: true};
                this.emit('pairing', 'Interview successful', JSON.stringify(log));
                entity.device.modelID = entity.device._modelID;
                this.emit('new', entity);
                // send to extensions again (for configure)
                this.callExtensionMethod(
                    'onZigbeeEvent',
                    [message, entity ? entity.mapped : null],
                );
            } else {
                this.debug(
                    `Device '${friendlyName}' with Zigbee model '${message.device.modelID}' is NOT supported, ` +
                    `please follow https://www.zigbee2mqtt.io/how_tos/how_to_support_new_devices.html`
                );
                this.emit('pairing', 'Interview successful', {friendly_name: friendlyName, supported: false});
                entity.device.modelID = entity.device._modelID;
                this.emit('new', entity);
            }
        } else if (message.status === 'failed') {
            this.error(`Failed to interview '${friendlyName}', device has not succesfully been paired. ${message.error}`);
            this.emit('pairing', 'Interview failed', friendlyName);
        } else {
            if (message.status === 'started') {
                this.info(`Starting interview of '${friendlyName}'`);
                this.emit('pairing', 'Interview started', friendlyName);
            }
        }
    }

    async handleMessage(data) {
        this.debug(`handleMessage`, data);
        const entity = await this.resolveEntity(data.device || data.ieeeAddr);
        const name = (entity && entity._modelID) ? entity._modelID : data.device.ieeeAddr;
        this.debug(
            `Received Zigbee message from '${name}', type '${data.type}', cluster '${data.cluster}'` +
            `, data '${JSON.stringify(data.data)}' from endpoint ${data.endpoint.ID}` +
            (data.hasOwnProperty('groupID') ? ` with groupID ${data.groupID}` : ``)
        );
        this.event(data.type, entity, data);

        // Call extensions
        this.callExtensionMethod(
            'onZigbeeEvent',
            [data, entity ? entity.mapped : null],
        );
    }

    async getMap(callback) {
        try {

            const devices = this.herdsman.getDevices(true);
            const lqis = [];
            const routing = [];

            for (const device of devices.filter((d) => d.type != 'EndDevice')) {
                const resolved = await this.resolveEntity(device);
                let result;

                try {
                    result = await device.lqi();
                } catch (error) {
                    this.sendError(error);
                    if (error)
                        this.debug(`Failed to execute LQI for '${resolved.name}'. ${safeJsonStringify(error.stack)}`);

                    lqis.push({
                        parent: 'undefined',
                        networkAddress: 0,
                        ieeeAddr: device.ieeeAddr,
                        lqi: 'undefined',
                        relationship: 0,
                        depth: 0,
                        status: 'offline',
                    });
                }

                if (result !== undefined) {
                    for (const dev of result.neighbors) {
                        if (dev.ieeeAddr !== '0xffffffffffffffff' && dev !== undefined) {
                            lqis.push({
                                parent: resolved.device.ieeeAddr,
                                networkAddress: dev.networkAddress,
                                ieeeAddr: dev.ieeeAddr,
                                lqi: dev.linkquality,
                                relationship: dev.relationship,
                                depth: dev.depth,
                                status: (dev.linkquality > 0) ? 'online' : 'offline',
                            });
                        }
                    }
                }

                this.debug(`LQI succeeded for '${resolved.name}'`);

                try {
                    result = await device.routingTable();
                } catch (error) {
                    this.sendError(error);
                    if (error) {
                        this.debug(`Failed to execute routing table for '${resolved.name}'. ${safeJsonStringify(error.stack)}`);
                    }
                }

                this.debug(`Routing for '${resolved.name}': ${safeJsonStringify(result)}`);
                if (result !== undefined) {
                    if (result.table !== undefined) {
                        for (const dev of result.table) {
                            routing.push({
                                source: resolved.device.ieeeAddr,
                                destination: dev.destinationAddress,
                                nextHop: dev.nextHop,
                                status: dev.status,
                            });
                        }
                    }
                }
                this.debug(`Routing table succeeded for '${resolved.name}'`);

            }
            this.debug(`Get map succeeded ${safeJsonStringify(lqis)}`);

            if (callback) callback({lqis: lqis, routing: routing});
        } catch (error) {
            this.sendError(error);
            this.debug(`Failed to get map: ${safeJsonStringify(error.stack)}`);
        }
    }

    async publish(deviceID, cid, cmd, zclData, cfg, ep, type, callback, zclSeqNum) {
        const entity = await this.resolveEntity(deviceID, ep);
        const device = entity.device;
        const endpoint = entity.endpoint;
        if (!device) {
            this.error(
                `Zigbee cannot publish message to device because '${deviceID}' is not known`
            );
            return;
        }
        if (!endpoint) {
            this.error(
                `Zigbee cannot publish message to endpoint because '${ep}' is not known`
            );
            return;
        }

        this.debug(`Zigbee publish to '${deviceID}', ${cid} - cmd ${cmd} - payload ${JSON.stringify(zclData)} - cfg ${JSON.stringify(cfg)} - endpoint ${ep}`);

        if (cfg == null) {
            cfg = {};
        }

        if (type === 'foundation') {
            cfg.disableDefaultResponse = true;
            if (cmd === 'read' && !Array.isArray(zclData)) {
                // needs to be iterateable (string[] | number [])
                zclData[Symbol.iterator] = function* () {
                    let k;
                    for (k in this) {
                        yield k;
                    }
                };
            }
            let result;
            if (cmd === 'configReport') {
                result = await endpoint.configureReporting(cid, zclData, cfg);
            } else {
                result = await endpoint[cmd](cid, zclData, cfg);
            }
            if (callback) callback(undefined, result);
        }
        else if(type === 'functionalResp'){
              cfg.disableDefaultResponse = false;
              const result = await endpoint.commandResponse(cid, cmd, zclData, cfg, zclSeqNum);
              if (callback) callback(undefined, result);
        }
        else {
            cfg.disableDefaultResponse = false;
            const result = await endpoint.command(cid, cmd, zclData, cfg);
            if (callback) callback(undefined, result);
        }
    }

    async addDevToGroup(devId, groupId) {
        try {
            const entity = await this.resolveEntity(devId);
            const group = await this.resolveEntity(groupId);
            this.debug(`entity: ${safeJsonStringify(entity)}`);
            this.debug(`group: ${safeJsonStringify(group)}`);
            if (entity.endpoint.inputClusters.includes(4))
            {
                this.debug(`adding endpoint ${entity.endpoint.ID} to group`)
                await entity.endpoint.addToGroup(group.mapped);
            }
            else {
                let added = false;
                for (const ep of entity.endpoints)
                {
                    if (ep.inputClusters.includes(4))
                    {
                        this.debug(`adding endpoint ${ep.ID} to group`)
                        await ep.addToGroup(group.mapped);
                        added = true;
                        break;
                    }
                }
                if (!added) throw ('cluster genGroups not supported');
            }
        } catch (error) {
            this.sendError(error);
            this.error(`Exception when trying to Add ${devId}  to group ${groupId}`, error);
            return { error:`Failed to add ${devId}  to group ${groupId}: ${JSON.stringify(error)}` };
        }
        return {};
    }

    async removeDevFromAllGroups(devId) {
        try {
            const entity = await this.resolveEntity(devId);
            this.debug(`entity: ${safeJsonStringify(entity)}`);
            await entity.endpoint.removeFromAllGroups();
        } catch (error) {
            this.sendError(error);
            this.error(`Exception when trying remove ${devId} from all groups`, error);
            return { error: `Failed to remove dev ${devId} from all groups: ${error}`};
        }
        return {};
    }

    bind(ep, cluster, target, callback) {
        const log = ` ${ep.device.ieeeAddr} - ${cluster}`;
        target = !target ? this.getCoordinator() : target;

        this.debug(`Binding ${log}`);
        ep.bind(cluster, target, (error) => {
            if (error) {
                this.sendError(error);
                this.error(`Failed to bind ${log} - (${error})`);
            } else {
                this.debug(`Successfully bound ${log}`);
            }

            callback(error);
        });
    }

    unbind(ep, cluster, target, callback) {
        const log = ` ${ep.device.ieeeAddr} - ${cluster}`;
        target = !target ? this.getCoordinator() : target;

        this.debug(`Unbinding ${log}`);
        ep.unbind(cluster, target, (error) => {
            if (error) {
                this.error(`Failed to unbind ${log} - (${error})`);
            } else {
                this.debug(`Successfully unbound ${log}`);
            }

            callback(error);
        });
    }

    reset(mode, callback) {
        try {
            this.herdsman.reset(mode);
            if (callback) callback();
        } catch (error) {
            this.sendError(error);
            this.error(`Failed to reset ${error.stack}`);
            if (callback) callback(error);
        }
    }

    async touchlinkReset(permitTime) {
        try {
            await this.herdsman.touchlinkFactoryResetFirst();
            this.permitJoin(permitTime);
        } catch (error) {
            this.sendError(error);
            this.error(`Failed to touchlinkReset ${error.stack}`);
        }
    }

    async getChannelsEnergy() {
        const payload = {
            dstaddr: 0x0,
            dstaddrmode: 0x02,
            channelmask: 0x07FFF800,
            scanduration: 0x5,
            scancount: 1,
            nwkmanageraddr: 0x0000
        };
        const energyScan = this.herdsman.adapter.znp.waitFor(
            2, //unpi_1.Constants.Type.AREQ,
            5, //Subsystem.ZDO,
            'mgmtNwkUpdateNotify'
        );
        await this.herdsman.adapter.znp.request(
            0x5, //Subsystem.ZDO
            'mgmtNwkUpdateReq',
            payload,
            energyScan.ID
        );
        const result = await energyScan.start().promise;
        return result.payload;
    }

    // async clearAllNvMemItems() {
    //     try {
    //         let maxNvMemId;
    //         switch (this.version.product) {
    //         case ZnpVersion.zStack12: maxNvMemId = 0x0302; break;
    //         case ZnpVersion.zStack30x: maxNvMemId = 0x033F; break;
    //         case ZnpVersion.zStack3x0: maxNvMemId = 0x032F; break;
    //         }

    //         let deletedCount = 0;
    //         this.info(`Clearing all NVMEM items, from 0 to ${maxNvMemId}`);
    //         for (let id=0; id<=maxNvMemId; id++) {
    //             let len;
    //             const needOsal = !(this.version.product == ZnpVersion.zStack3x0 && id <= 7);
    //             if (needOsal) {
    //                 const lengthRes = await this.znp.request(Subsystem.SYS, 'osalNvLength', {id: id});
    //                 len = lengthRes.payload['length'];
    //             } else {
    //                 const lengthRes = await this.znp.request(Subsystem.SYS, 'nvLength',
    //                     {sysid: NvSystemIds.ZSTACK, itemid: id, subid: 0});
    //                 len = lengthRes.payload['len'];
    //             }
    //             if (len != 0) {
    //                 this.info(`NVMEM item #${id} - deleting, size: ${len}`);
    //                 if (needOsal) {
    //                     await this.znp.request(Subsystem.SYS, 'osalNvDelete',
    //                         {id: id, len: len},
    //                         null, null, [ZnpCommandStatus.SUCCESS, ZnpCommandStatus.NV_ITEM_INITIALIZED]);
    //                 } else {
    //                     await this.znp.request(Subsystem.SYS, 'nvDelete',
    //                         {sysid: NvSystemIds.ZSTACK, itemid: id, subid: 0},
    //                         null, null, [ZnpCommandStatus.SUCCESS, ZnpCommandStatus.NV_ITEM_INITIALIZED]);
    //                 }
    //                 deletedCount++;
    //             }
    //         }
    //         this.info(`Clearing all NVMEM items finished, deleted ${deletedCount} items`);
    //     } catch (error) {
    //         this.sendError(error);
    //         this.error(`Failed to clearAllNvMemItems ${error.stack}`);
    //     }
    // }

    async readAllNvMemItems() {
        try {
            const result = {};
            const nv = new AdapterNvMemory(this.herdsman.adapter.znp);
            for (const itemName in znpBackupItems) {
                if (znpBackupItems.hasOwnProperty(itemName)) {
                    const value = await nv.readItem(znpBackupItems[itemName], 0);
                    if (value !== null) {
                        this.info(`${itemName} = ${value.toString('hex')}`);
                        result[itemName] = value.toString('hex');
                    }
                }
            };
            return result;
        } catch (error) {
            this.sendError(error);
            this.error(`Failed to readAllNvMemItems ${error.stack}`);
        }
    }

    // async writeAllNvMemItems() {
    //     try {
    //         let maxNvMemId;
    //         switch (this.version.product) {
    //         case ZnpVersion.zStack12: maxNvMemId = 0x0302; break;
    //         case ZnpVersion.zStack30x: maxNvMemId = 0x033F; break;
    //         case ZnpVersion.zStack3x0: maxNvMemId = 0x032F; break;
    //         }

    //         let deletedCount = 0;
    //         this.info(`Clearing all NVMEM items, from 0 to ${maxNvMemId}`);
    //         for (let id=0; id<=maxNvMemId; id++) {
    //             let len;
    //             const needOsal = !(this.version.product == ZnpVersion.zStack3x0 && id <= 7);
    //             if (needOsal) {
    //                 const lengthRes = await this.znp.request(Subsystem.SYS, 'osalNvLength', {id: id});
    //                 len = lengthRes.payload['length'];
    //             } else {
    //                 const lengthRes = await this.znp.request(Subsystem.SYS, 'nvLength',
    //                     {sysid: NvSystemIds.ZSTACK, itemid: id, subid: 0});
    //                 len = lengthRes.payload['len'];
    //             }
    //             if (len != 0) {
    //                 this.info(`NVMEM item #${id} - deleting, size: ${len}`);
    //                 if (needOsal) {
    //                     await this.znp.request(Subsystem.SYS, 'osalNvDelete',
    //                         {id: id, len: len},
    //                         null, null, [ZnpCommandStatus.SUCCESS, ZnpCommandStatus.NV_ITEM_INITIALIZED]);
    //                 } else {
    //                     await this.znp.request(Subsystem.SYS, 'nvDelete',
    //                         {sysid: NvSystemIds.ZSTACK, itemid: id, subid: 0},
    //                         null, null, [ZnpCommandStatus.SUCCESS, ZnpCommandStatus.NV_ITEM_INITIALIZED]);
    //                 }
    //                 deletedCount++;
    //             }
    //         }
    //         this.info(`Clearing all NVMEM items finished, deleted ${deletedCount} items`);
    //     } catch (error) {
    //         this.sendError(error);
    //         this.error(`Failed to clearAllNvMemItems ${error.stack}`);
    //     }
    // }
}

module.exports = ZigbeeController;
