/* global QUnit, sinon */
sap.ui.require([
	"sap/ui/dt/plugin/MiniMenu",
	"sap/ui/dt/OverlayRegistry",
	"sap/ui/dt/DesignTime",
	"sap/ui/dt/MiniMenuControl",
	"sap/ui/rta/plugin/Rename",
	'sap/ui/rta/command/CommandFactory',
	"sap/ui/Device",
	// controls
	"sap/m/Button",
	"sap/m/Popover",
	"sap/m/OverflowToolbarButton",
	"sap/m/FlexBox",
	"sap/ui/layout/VerticalLayout"
], function (
	MiniMenuPlugin,
	OverlayRegistry,
	DesignTime,
	MiniMenuControl,
	RenamePlugin,
	CommandFactory,
	Device,
	Button,
	Popover,
	OverflowToolbarButton,
	FlexBox,
	VerticalLayout
) {
	"use strict";
	var oSandbox = sinon.sandbox.create();
	QUnit.module("MiniMenu API", {
		beforeEach: function (assert) {
			var that = this;
			this.oButton1 = new Button("button1");
			this.oButton2 = new Button();
			this.oButtonUnselectable = new Button();
			this.oLayout = new VerticalLayout({
				content: [
					this.oButton1, this.oButton2, this.oButtonUnselectable
				]
			});
			this.oLayout.placeAt("qunit-fixture");
			sap.ui.getCore().applyChanges();
			this.oMenuEntries = {};
			this.oMenuEntries.available = {
				id: "CTX_ALWAYS_THERE",
				text: function () {
					return "item that is always there";
				},
				handler: sinon.spy()
			};
			this.oMenuEntries.enabledBtn1 = {
				id: "CTX_ENABLED_BUTTON1",
				text: "enabled for button 1",
				handler: sinon.spy(),
				enabled: function (oOverlay) {
					var oElement = oOverlay.getElement();
					return oElement === that.oButton1;
				}
			};
			this.oMenuEntries.disabledBtn1 = {
				id: "CTX_DISABLED_BUTTON1",
				text: "disabled for button 1",
				handler: sinon.spy(),
				available: function (oOverlay) {
					var oElement = oOverlay.getElement();
					return oElement === that.oButton1 || oElement === that.oButton2;
				},
				enabled: function (oOverlay) {
					var oElement = oOverlay.getElement();
					return oElement !== that.oButton1;
				}
			};
			this.oMenuEntries.onlyBtn2 = {
				id: "CTX_ONLY_BUTTON2",
				text: "only shown for button 2",
				rank: 1,
				handler: sinon.spy(),
				available: function (oOverlay) {
					var oElement = oOverlay.getElement();
					return oElement === that.oButton2;
				}
			};
			this.oMenuEntries.alwaysStartSection = {
				id: "CTX_START_SECTION",
				text: "starts new section ",
				rank: 2,
				handler: sinon.spy(),
				startSection: true
			};
			this.oMenuEntries.startSectionButton1 = {
				id: "CTX_START_SECTION_BTN1",
				text: "starts new section for button1",
				handler: sinon.spy(),
				startSection: function (oElement) {
					return oElement === that.oButton1;
				}
			};
			this.oMenuEntries.dynamicTextItem = {
				id: "CTX_DYNAMIC_TEXT",
				text: function (oOverlay) {
					var oElement = oOverlay.getElement();
					return oElement.getId();
				},
				handler: sinon.spy()
			};
			var oCommandFactory = new CommandFactory();
			this.oMiniMenuPlugin = new MiniMenuPlugin();
			for (var key in this.oMenuEntries) {
				this.oMiniMenuPlugin.addMenuItem(this.oMenuEntries[key]);
			}
			this.oRenamePlugin = new RenamePlugin({
				id : "nonDefaultRenamePlugin",
				commandFactory : oCommandFactory
			});
			var done = assert.async();
			this.oDesignTime = new DesignTime({
				rootElements: [
					this.oLayout
				],
				plugins: [
					this.oMiniMenuPlugin,
					this.oRenamePlugin
				]
			});
			this.oDesignTime.attachEventOnce("synced", function () {
				sap.ui.getCore().applyChanges();
				that.oButton1Overlay = OverlayRegistry.getOverlay(that.oButton1);
				that.oButton1Overlay.setSelectable(true);
				that.oButton2Overlay = OverlayRegistry.getOverlay(that.oButton2);
				that.oButton2Overlay.setSelectable(true);
				that.oUnselectableOverlay = OverlayRegistry.getOverlay(that.oButtonUnselectable);
				done();
			});
			this.oMiniMenuControl = this.oMiniMenuPlugin.oMiniMenuControl;
		},
		afterEach: function () {
			this.oDesignTime.destroy();
			this.oLayout.destroy();
			oSandbox.restore();
		}
	}, function() {
		QUnit.test("Hiding then showing the MiniMenu", function (assert) {
			this.clock = sinon.useFakeTimers();
			sap.ui.test.qunit.triggerMouseEvent(this.oButton2Overlay.getDomRef(), "contextmenu");
			var oMiniMenuControl = this.oMiniMenuPlugin.oMiniMenuControl;
			assert.ok(oMiniMenuControl.getPopover().isOpen(), "MiniMenu should be open");
			oMiniMenuControl.close();
			this.clock.tick(400); //animation of the closing of the Popover
			assert.ok(!oMiniMenuControl.getPopover().isOpen(), "MiniMenu should be closed");
			sap.ui.test.qunit.triggerMouseEvent(this.oButton2Overlay.getDomRef(), "contextmenu");
			assert.ok(oMiniMenuControl.getPopover().isOpen(), "MiniMenu should be open");
			oMiniMenuControl = null;
			this.clock.restore();
		});
		QUnit.test("Reopen the MiniMenu on another overlay", function (assert) {
			var done = assert.async();
			Device.browser.edge = true;
			var oMiniMenuControl = this.oMiniMenuPlugin.oMiniMenuControl;
			sap.ui.test.qunit.triggerMouseEvent(this.oButton1Overlay.getDomRef(), "contextmenu");
			oMiniMenuControl.attachEventOnce("Opened", function() {
				assert.ok(oMiniMenuControl.getPopover().isOpen(), "MiniMenu should be open");
				sap.ui.test.qunit.triggerMouseEvent(this.oButton2Overlay.getDomRef(), "contextmenu");
			}.bind(this));
			oMiniMenuControl.attachEventOnce("Closed", function() {
				assert.ok(!oMiniMenuControl.getPopover().isOpen(), "MiniMenu should be closed");
				oMiniMenuControl.attachEventOnce("Opened", function() {
					assert.ok(oMiniMenuControl.getPopover().isOpen(), "MiniMenu should be reopened again");
					oMiniMenuControl = null;
					Device.browser.edge = false;
					done();
				});
			});
		});
		QUnit.test("Calling the _popupClosed function", function (assert) {
			sap.ui.test.qunit.triggerMouseEvent(this.oButton2Overlay.getDomRef(), "contextmenu");
			var oMiniMenuControl = this.oMiniMenuPlugin.oMiniMenuControl;
			oMiniMenuControl.bOpenNew = false;
			oMiniMenuControl._popupClosed();
			assert.ok(!oMiniMenuControl.bOpen, "MiniMenu should be closed");
			oMiniMenuControl = null;
		});
		QUnit.test("Calling the _popupClosed function in expanded mode", function (assert) {
			sap.ui.test.qunit.triggerMouseEvent(this.oButton2Overlay.getDomRef(), "contextmenu");
			var oMiniMenuControl = this.oMiniMenuPlugin.oMiniMenuControl;
			assert.ok(oMiniMenuControl.bOpen, "MiniMenu should be opened");
			oMiniMenuControl._popupClosed();
			assert.ok(!oMiniMenuControl.bOpen, "MiniMenu should be closed");
			oMiniMenuControl = null;
		});
		QUnit.test("Calling _checkForPluginLock", function (assert) {
			assert.ok(!this.oMiniMenuPlugin._checkForPluginLock(this.oButton2Overlay), "Should return false");
		});
		QUnit.test("Calling _addMenuItemToGroup", function (assert) {
			var that = this;
			var oTestButton = {
				id: "CTX_ENABLED_BUTTON1",
				text: "enabled for button 1",
				handler: sinon.spy(),
				enabled: function (oOverlay) {
					var oElement = oOverlay.getElement();
					return oElement === that.oButton1;
				},
				group: "Test1"
			};
			this.oMiniMenuPlugin._addMenuItemToGroup(oTestButton);
			assert.strictEqual(this.oMiniMenuPlugin._aGroupedItems.length, 1, "should add a Button to grouped Items");
			var oTestButton2 = {
				id: "CTX_ENABLED_BUTTON1",
				text: "enabled for button 1",
				handler: sinon.spy(),
				enabled: function (oOverlay) {
					var oElement = oOverlay.getElement();
					return oElement === that.oButton1;
				},
				group: "Test1"
			};
			this.oMiniMenuPlugin._addMenuItemToGroup(oTestButton2);
			assert.strictEqual(this.oMiniMenuPlugin._aGroupedItems.length, 1, "should add a Button to grouped Items without creating a new group");
			var oTestButton3 = {
				id: "CTX_ENABLED_BUTTON1",
				text: "enabled for button 1",
				handler: sinon.spy(),
				enabled: function (oOverlay) {
					var oElement = oOverlay.getElement();
					return oElement === that.oButton1;
				},
				group: "Test2"
			};
			this.oMiniMenuPlugin._addMenuItemToGroup(oTestButton3);
			assert.strictEqual(this.oMiniMenuPlugin._aGroupedItems.length, 2, "should add a Button to grouped Items and creating a new group");
		});
		QUnit.test("Adding a Submenu", function (assert) {
			this.clock = sinon.useFakeTimers();
			var fnHandler = function () {
				return undefined;
			};
			var sId = "I_AM_A_SUBMENU";
			var sSubId1 = "I_am_a_sub_menu_item";
			var sSubId2 = "I_am_another_sub_menu_item";
			var oTestItem = {
				id: sId,
				test: "submenu",
				handler: fnHandler,
				enabled: true,
				submenu: [
					{
						id: sSubId1,
						text: "text",
						icon: "sap-icon://fridge",
						enabled: true
					},
					{
						id: sSubId2,
						text: "more_text",
						icon: "sap-icon://dishwasher",
						enabled: true
					}
				]
			};
			this.oMiniMenuPlugin._addSubMenu(oTestItem, {}, this.oButton1Overlay);
			assert.strictEqual(this.oMiniMenuPlugin._aSubMenus.length, 1, "there should be one submenu");
			assert.strictEqual(this.oMiniMenuPlugin._aSubMenus[0].sSubMenuId, sId, "should add the submenu");
			assert.strictEqual(this.oMiniMenuPlugin._aSubMenus[0].aSubMenuItems[0].id, sSubId1, "should add the submenu items");
			assert.strictEqual(this.oMiniMenuPlugin._aSubMenus[0].aSubMenuItems[1].id, sSubId2, "should add all the submenu items");
			var oCloseStub = oSandbox.stub(this.oMiniMenuPlugin.oMiniMenuControl, "close");
			var oOpenStub = oSandbox.stub(this.oMiniMenuPlugin, "open");
			var oLockMenuOpeningStub = oSandbox.stub(this.oMiniMenuPlugin, "lockMenuOpening");
			var iItemsCount = this.oMiniMenuPlugin._aMenuItems.length;
			oTestItem.handler();
			assert.equal(oCloseStub.callCount, 1, "then mini menu control close function is called");
			assert.equal(this.oMiniMenuPlugin._aMenuItems.length - iItemsCount, 2, "then submenu items were added to minimenu");
			assert.equal(oLockMenuOpeningStub.callCount, 1, "then lockMenuOpening function is called");
			this.clock.tick();
			assert.equal(oOpenStub.callCount, 1, "then mini menu open function is called");
			this.clock.restore();
		});
		QUnit.test("Adding multiple Submenus", function (assert) {
			var fnHandler = function () {
				return undefined;
			};
			var sId0 = "I_AM_A_SUBMENU";
			var sSubId0 = "I_am_in_sub_menu_0";
			var sSubId1 = "I_am_also_in_sub_menu_0";
			var sId1 = "I_AM_ANOTHER_SUBMENU";
			var sSubId2 = "I_am_in_sub_menu_1";
			var sSubId3 = "I_am_also_in_sub_menu_1";
			var oTestItem0 = {
				id: sId0,
				test: "submenu",
				handler: fnHandler,
				enabled: true,
				submenu: [
					{
						id: sSubId0,
						text: "text",
						icon: "sap-icon://fridge",
						enabled: true
					},
					{
						id: sSubId1,
						text: "more_text",
						icon: "sap-icon://dishwasher",
						enabled: true
					}
				]
			};
			var oTestItem1 = {
				id: sId1,
				test: "submenu",
				handler: fnHandler,
				enabled: true,
				submenu: [
					{
						id: sSubId2,
						text: "even_more_text",
						icon: "sap-icon://washing-machine",
						enabled: true
					},
					{
						id: sSubId3,
						text: "hmm_text",
						icon: "sap-icon://sap-ui5",
						enabled: true
					}
				]
			};
			this.oMiniMenuPlugin._addSubMenu(oTestItem0);
			this.oMiniMenuPlugin._addSubMenu(oTestItem1);
			assert.strictEqual(this.oMiniMenuPlugin._aSubMenus.length, 2, "there should be two submenu");
			assert.strictEqual(this.oMiniMenuPlugin._aSubMenus[0].sSubMenuId, sId0, "should add submenu 0");
			assert.strictEqual(this.oMiniMenuPlugin._aSubMenus[0].aSubMenuItems[0].id, sSubId0, "should add submenu item 0 to sub menu 0");
			assert.strictEqual(this.oMiniMenuPlugin._aSubMenus[0].aSubMenuItems[1].id, sSubId1, "should add submenu item 1 to sub menu 0");
			assert.strictEqual(this.oMiniMenuPlugin._aSubMenus[1].sSubMenuId, sId1, "should add submenu 1");
			assert.strictEqual(this.oMiniMenuPlugin._aSubMenus[1].aSubMenuItems[0].id, sSubId2, "should add submenu item 2 to sub menu 1");
			assert.strictEqual(this.oMiniMenuPlugin._aSubMenus[1].aSubMenuItems[1].id, sSubId3, "should add submenu item 3 to sub menu 1");
		});
		QUnit.test("Calling _addItemGroupsToMenu", function (assert) {
			this.clock = sinon.useFakeTimers();
			var that = this;
			var oTestButton = {
				id: "CTX_ENABLED_BUTTON1",
				text: "enabled for button 1",
				handler: sinon.spy(),
				enabled: function (oOverlay) {
					var oElement = oOverlay.getElement();
					return oElement === that.oButton1;
				},
				group: "Test1"
			};
			this.oMiniMenuPlugin._addMenuItemToGroup(oTestButton);
			var oTestButton2 = {
				id: "CTX_ENABLED_BUTTON3",
				text: "enabled for button 3",
				handler: sinon.spy(),
				enabled: function (oOverlay) {
					var oElement = oOverlay.getElement();
					return oElement === that.oButton1;
				},
				group: "Test2",
				rank: 10
			};
			this.oMiniMenuPlugin._addMenuItemToGroup(oTestButton2);
			this.oMiniMenuPlugin._addMenuItemToGroup(oTestButton2);
			this.oButton2Overlay.attachBrowserEvent("click", function (oEvent) {
				this.oTestEvent = oEvent;
				oEvent.stopPropagation();
			}, this);
			sap.ui.test.qunit.triggerMouseEvent(this.oButton2Overlay.getDomRef(), "click");
			this.oMiniMenuPlugin._addItemGroupsToMenu(this.oTestEvent, this.oButton2Overlay);
			assert.strictEqual(this.oMiniMenuPlugin._aMenuItems.length, 9, "Should have added 2 Buttons");
			this.oMiniMenuPlugin._aMenuItems[this.oMiniMenuPlugin._aMenuItems.length - 1].menuItem.handler();
			assert.strictEqual(this.oMiniMenuPlugin.isMenuOpeningLocked(), true, "Opening should be locked");
			this.clock.tick();
			this.oMiniMenuPlugin.oMiniMenuControl.close();
			this.clock.restore();
		});
		QUnit.test("Pressing the Overflow Button on a MiniMenu", function (assert) {
			this.clock = sinon.useFakeTimers();
			sap.ui.test.qunit.triggerMouseEvent(this.oButton2Overlay.getDomRef(), "click");
			var oMiniMenuControl = this.oMiniMenuPlugin.oMiniMenuControl;
			this.clock.tick(this.oMiniMenuPlugin.iMenuLeftclickOpeningDelay);
			oMiniMenuControl._onOverflowPress.bind(oMiniMenuControl)();
			assert.ok(true, "Should throw no error");
			oMiniMenuControl = null;
			this.clock.restore();
		});
		QUnit.test("Testing onHover function", function (assert) {
			this.clock = sinon.useFakeTimers();
			sap.ui.test.qunit.triggerMouseEvent(this.oButton2Overlay.getDomRef(), "mouseover");
			var oMiniMenuControl = this.oMiniMenuPlugin.oMiniMenuControl;
			assert.ok(!oMiniMenuControl.bOpen, "MiniMenu should not be opened");
			this.clock.tick(this.oMiniMenuPlugin.iMenuHoverOpeningDelay);
			assert.ok(oMiniMenuControl.bOpen, "MiniMenu should be open");
			assert.strictEqual(oMiniMenuControl.getFlexbox().getDirection(), "Row", "Flexbox should be set to Row");
			oMiniMenuControl = null;
			this.clock.restore();
		});
		QUnit.test("Testing onHover with onHoverExit function", function (assert) {
			this.clock = sinon.useFakeTimers();
			sap.ui.test.qunit.triggerMouseEvent(this.oButton2Overlay.getDomRef(), "mouseover");
			var oMiniMenuControl = this.oMiniMenuPlugin.oMiniMenuControl;
			assert.ok(!oMiniMenuControl.bOpen, "MiniMenu should not be opened");
			sap.ui.test.qunit.triggerMouseEvent(this.oButton2Overlay.getDomRef(), "mouseout");
			this.clock.tick(this.oMiniMenuPlugin.iMenuHoverOpeningDelay);
			assert.ok(!oMiniMenuControl.bOpen, "MiniMenu should not be open");
			oMiniMenuControl = null;
			this.clock.restore();
		});
		QUnit.test("Testing onHover with multiple overlays", function (assert) {
			this.clock = sinon.useFakeTimers();
			var oMiniMenuControl = this.oMiniMenuPlugin.oMiniMenuControl;
			var oCloseMiniMenuSpy = oSandbox.spy(oMiniMenuControl, "close");
			sap.ui.test.qunit.triggerMouseEvent(this.oButton2Overlay.getDomRef(), "mouseover");
			this.clock.tick(this.oMiniMenuPlugin.iMenuHoverOpeningDelay);
			assert.ok(oMiniMenuControl.bOpen, "then after onHover MiniMenu should be open on the first overlay");
			sap.ui.test.qunit.triggerMouseEvent(this.oButton2Overlay.getDomRef(), "mouseout");
			sap.ui.test.qunit.triggerMouseEvent(this.oButton1Overlay.getDomRef(), "mouseover");
			this.clock.tick(this.oMiniMenuPlugin.iMenuHoverClosingDelay);
			assert.equal(oCloseMiniMenuSpy.callCount, 1, "then after onHover at the second overlay the open minimenu is closed");
			this.clock.tick(this.oMiniMenuPlugin.iMenuHoverOpeningDelay);
			assert.ok(oMiniMenuControl.bOpen, "then MiniMenu should be open at the second overlay");
			this.clock.restore();
			oMiniMenuControl = null;
		});
		QUnit.test("Testing onHover wrong delay exception", function (assert) {
			oSandbox.stub(this.oMiniMenuPlugin, "getOpenOnHover").returns(true);
			oSandbox.stub(this.oMiniMenuPlugin, "_shouldMiniMenuOpen").returns(true);
			var oFakeEvent = {
				currentTarget: { id: this.oButton1Overlay.getId() },
				stopPropagation: function() {}
			};
			this.oMiniMenuPlugin.iMenuHoverClosingDelay = 100;
			this.oMiniMenuPlugin.iMenuHoverOpeningDelay = 50;
			assert.throws(function() { this.oMiniMenuPlugin._onHover(oFakeEvent); }.bind(this),
				/sap.ui.dt MiniMenu iMenuHoverClosingDelay is bigger or equal to iMenuHoverOpeningDelay!/,
				"then corresoponding exception is thrown");
		});
		QUnit.test("Testing onClick function", function (assert) {
			this.clock = sinon.useFakeTimers();
			sap.ui.test.qunit.triggerMouseEvent(this.oButton2Overlay.getDomRef(), "click");
			var oMiniMenuControl = this.oMiniMenuPlugin.oMiniMenuControl;
			assert.ok(!oMiniMenuControl.bOpen, "MiniMenu should not be opened");
			this.clock.tick(this.oMiniMenuPlugin.iMenuLeftclickOpeningDelay);
			assert.ok(oMiniMenuControl.bOpen, "MiniMenu should be open");
			assert.strictEqual(oMiniMenuControl.getFlexbox().getDirection(), "Row", "Flexbox should be set to Row");
			oMiniMenuControl = null;
			this.clock.restore();
		});
		QUnit.test("Testing onClick function unlocking opening of the MiniMenu", function (assert) {
			this.clock = sinon.useFakeTimers();
			var oMiniMenuControl = this.oMiniMenuPlugin.oMiniMenuControl;
			this.oMiniMenuPlugin.lockMenuOpening();
			sap.ui.test.qunit.triggerMouseEvent(this.oButton2Overlay.getDomRef(), "click");
			assert.ok(!oMiniMenuControl.bOpen, "MiniMenu should not be opened");
			this.clock.tick(this.oMiniMenuPlugin.iMenuLeftclickOpeningDelay);
			assert.ok(!oMiniMenuControl.bOpen, "MiniMenu should not be open");
			oMiniMenuControl = null;
			this.clock.restore();
		});
		QUnit.test("Testing onTouch function", function (assert) {
			this.clock = sinon.useFakeTimers();
			this.oMiniMenuPlugin._ensureSelection(this.oButton2Overlay);
			this.oMiniMenuPlugin.iMenuTouchOpeningDelay = 150;
			this.oMiniMenuPlugin.touchTimeout = setTimeout(function() {
				assert.notOk(true, "timeout should not be executed, it should be cleared onTouch!");
			}, 100);
			sap.ui.test.qunit.triggerMouseEvent(this.oButton2Overlay.getDomRef(), "touchstart");
			var oMiniMenuControl = this.oMiniMenuPlugin.oMiniMenuControl;
			assert.ok(!oMiniMenuControl.getPopover().isOpen(), "MiniMenu should not be opened");
			this.clock.tick(this.oMiniMenuPlugin.iMenuTouchOpeningDelay);
			assert.ok(oMiniMenuControl.getPopover().isOpen(), "MiniMenu should be open");
			assert.strictEqual(oMiniMenuControl.getFlexbox().getDirection(), "Row", "Flexbox should be set to Row");
			oMiniMenuControl = null;
			this.clock.restore();
		});
		QUnit.test("Testing onKeyDown function", function (assert) {
			var _tempListener = function (oEvent) {
				oEvent.keyCode = jQuery.sap.KeyCodes.F10;
				oEvent.shiftKey = true;
				oEvent.altKey = false;
				oEvent.ctrlKey = false;
				var oMiniMenuControl = this.oMiniMenuPlugin.oMiniMenuControl;
				this.oMiniMenuPlugin._onKeyDown(oEvent);
				assert.ok(oMiniMenuControl.bOpen, "MiniMenu should be open");
				assert.strictEqual(oMiniMenuControl.getFlexbox().getDirection(), "Column", "Flexbox should be set to Column");
				oMiniMenuControl = null;
			}.bind(this);
			this.oButton2Overlay.attachBrowserEvent("keydown", _tempListener, this);
			sap.ui.test.qunit.triggerMouseEvent(this.oButton2Overlay.getDomRef(), "keydown");
		});
		QUnit.test("Performing a right click when a Timeout from left-click/hover is active", function (assert) {
			sap.ui.test.qunit.triggerMouseEvent(this.oButton2Overlay.getDomRef(), "click");
			var oMiniMenuControl = this.oMiniMenuPlugin.oMiniMenuControl;
			assert.ok(!oMiniMenuControl.bOpen, "MiniMenu should not be opened");
			sap.ui.test.qunit.triggerMouseEvent(this.oButton2Overlay.getDomRef(), "contextmenu");
			assert.ok(oMiniMenuControl.bOpen, "MiniMenu should be open");
			assert.strictEqual(oMiniMenuControl.getFlexbox().getDirection(), "Column", "Flexbox should be set to Column");
			oMiniMenuControl = null;
		});
		QUnit.test("Clicking on a button in the MiniMenu", function (assert) {
			sap.ui.test.qunit.triggerMouseEvent(this.oButton2Overlay.getDomRef(), "contextmenu");
			var oMiniMenuControl = this.oMiniMenuPlugin.oMiniMenuControl;
			assert.ok(oMiniMenuControl.bOpen, "MiniMenu should be open");
			assert.strictEqual(oMiniMenuControl.getFlexbox().getDirection(), "Column", "Flexbox should be set to Column");
			this.oMiniMenuPlugin._oCurrentOverlay = this.oButton2Overlay;
			oMiniMenuControl.getFlexbox().getItems()[0].firePress();
			oMiniMenuControl = null;
		});
		QUnit.test("Deregistering an Overlay", function (assert) {
			this.oMiniMenuPlugin.deregisterElementOverlay(this.oButton1Overlay);
			assert.ok(true, "Should throw no error");
		});
		QUnit.test("calling _getPopoverDimensions for different kinds of menus", function (assert) {
			this.clock = sinon.useFakeTimers();
			sap.ui.test.qunit.triggerMouseEvent(this.oButton2Overlay.getDomRef(), "click");
			var oMiniMenuControl = this.oMiniMenuPlugin.oMiniMenuControl;
			this.clock.tick(this.oMiniMenuPlugin.iMenuLeftclickOpeningDelay);
			var oPopoverContext = oMiniMenuControl._getPopoverDimensions(true, false);
			var oPopover = oMiniMenuControl._getPopoverDimensions(false, true);
			var oPopoverExpanded = oMiniMenuControl._getPopoverDimensions(true, true);
			assert.strictEqual(typeof oPopoverContext.height, "number", "the height of a context menu should be a number");
			assert.ok(!isNaN(oPopoverContext.height), "the height of a context menu shouldn't be NaN");
			assert.strictEqual(typeof oPopoverContext.width, "number", "the width of a context menu should be a number");
			assert.ok(!isNaN(oPopoverContext.width), "the width of a context menu shouldn't be NaN");
			assert.strictEqual(typeof oPopover.height, "number", "the height of a non-expanded MiniMenu should be a number");
			assert.ok(!isNaN(oPopover.height), "the height of a non-expanded MiniMenu shouldn't be NaN");
			assert.strictEqual(typeof oPopover.width, "number", "the width of a non-expanded MiniMenu should be a number");
			assert.ok(!isNaN(oPopover.width), "the width of a non-expanded MiniMenu shouldn't be NaN");
			assert.strictEqual(typeof oPopoverExpanded.height, "number", "the height of an expanded MiniMenu should be a number");
			assert.ok(!isNaN(oPopoverExpanded.height), "the height of an expanded MiniMenu shouldn't be NaN");
			assert.strictEqual(typeof oPopoverExpanded.width, "number", "the width of an expanded MiniMenu should be a number");
			assert.ok(!isNaN(oPopoverExpanded.width), "the width of an expanded MiniMenu shouldn't be NaN");
			assert.ok(oPopoverContext.height < oPopoverExpanded.height, "the height of a context menu should be less than the hight of an expanded MiniMenu (if they have the same amount of buttons)");
			assert.ok(oPopoverContext.width < oPopoverExpanded.width, "the width of a context menu should be less than that of an expanded MiniMenu (if they have the same amount of buttons)");
			assert.ok(oPopover.height < oPopoverExpanded.width, "an expanded MiniMenu should be higher than a non-expanded MiniMenu (if the expanded one has more than one buttons");
			this.clock.restore();
		});
		QUnit.test("calling _checkForPluginLock", function (assert) {
			Device.os.ios = true;
			assert.notOk(this.oMiniMenuPlugin._checkForPluginLock(), "then return false for ios devices");
			Device.os.ios = false;
			this.oMiniMenuPlugin._bFocusLocked = true;
			assert.notOk(this.oMiniMenuPlugin._checkForPluginLock(), "then return false when no busy plugin exists");
			assert.notOk(this.oMiniMenuPlugin._bFocusLocked, "then reset the focus lock when no busy plugin exists");
			var oBusyPlugin = { isBusy: function() { return true; } };
			this.oMiniMenuPlugin._aPluginsWithBusyFunction.push(oBusyPlugin);
			assert.ok(this.oMiniMenuPlugin._checkForPluginLock(), "then return true when busy plugin exists");
		});
		QUnit.test("calling _shouldMiniMenuOpen", function (assert) {
			this.oMiniMenuPlugin._bTouched = false;
			this.oMiniMenuPlugin._bOpeningLocked = true;
			assert.notOk(this.oMiniMenuPlugin._shouldMiniMenuOpen(), "then return false when menu opening locked");
			this.oMiniMenuPlugin._bOpeningLocked = false;
			oSandbox.stub(this.oMiniMenuPlugin, "_checkForPluginLock").returns(true);
			assert.notOk(this.oMiniMenuPlugin._shouldMiniMenuOpen(), "then return false when busy plugin exists");
			this.oMiniMenuPlugin._bTouched = true;
			assert.ok(this.oMiniMenuPlugin._shouldMiniMenuOpen({}, true), "then return true if touched");
			var oEvent = { currentTarget: { id: "button1" } };
			assert.ok(this.oMiniMenuPlugin._shouldMiniMenuOpen(oEvent, false), "then return true if touched");
			assert.equal(this.oMiniMenuPlugin._oCurrentOverlay.getId(), oEvent.currentTarget.id, "then current overlay is set when not locked and not on hover");
		});
		QUnit.test("calling _clearHoverTimeout", function(assert) {
			this.clock = sinon.useFakeTimers();
			var done = assert.async();
			this.oMiniMenuPlugin.hoverTimeout = setTimeout(function() {
				assert.notOk(true, "hover timeout should not be finished");
			}, 500);
			this.oMiniMenuPlugin._closingTimeout = setTimeout(function() {
				assert.notOk(true, "closing timeout should not be finished");
			}, 500);
			this.oMiniMenuPlugin._clearHoverTimeout();
			setTimeout(function() {
				assert.ok(true, "then both timeouts have been cleared");
				done();
			}, 1000);
			this.clock.tick(1000);
			this.clock.restore();
		});
		QUnit.test("calling open with plain menu item for overlay", function(assert) {
			var oEvent = {};
			var oPlainMenuItem = { id: "plainItem", group: undefined, submenu: undefined };
			var aPlugins = [
				{ getMenuItems: function() { return [oPlainMenuItem]; } }
			];
			var oAddMenuItemStub = oSandbox.stub(this.oMiniMenuPlugin, "addMenuItem");
			oSandbox.stub(this.oDesignTime, "getPlugins").returns(aPlugins);
			this.oMiniMenuPlugin.open(oEvent, this.oButton1Overlay, true, false);
			assert.equal(oAddMenuItemStub.callCount, 1, "then addMenuItems is called");
			assert.equal(oAddMenuItemStub.args[0][0], oPlainMenuItem, "then addMenuItems is called with the plain menu item");
			oSandbox.restore();
		});
		QUnit.test("calling open with only group menu item for overlay", function(assert) {
			var oEvent = {};
			var oGroupMenuItem = { id: "groupItem", group: "group1", submenu: undefined };
			var aPlugins = [
				{ getMenuItems: function() { return [oGroupMenuItem]; } }
			];
			var oAddMenuItemToGroupStub = oSandbox.stub(this.oMiniMenuPlugin, "_addMenuItemToGroup");
			oSandbox.stub(this.oDesignTime, "getPlugins").returns(aPlugins);
			this.oMiniMenuPlugin.open(oEvent, this.oButton1Overlay, false, false);
			assert.equal(oAddMenuItemToGroupStub.callCount, 1, "then _addMenuItemToGroup is called");
			assert.equal(oAddMenuItemToGroupStub.args[0][0], oGroupMenuItem, "then _addMenuItemToGroup is called with the group menu item");
			oSandbox.restore();
		});
		QUnit.test("calling open with only plain menu items for overlay", function(assert) {
			var oEvent = {};
			var oPlainMenuItem = { id: "plainItem", group: undefined, submenu: undefined };
			var oSubMenuItem = { id: "subItem", group: undefined, submenu: [oPlainMenuItem] };
			var aPlugins = [
				{ getMenuItems: function() { return [oSubMenuItem]; } }
			];
			var oAddSubMenuStub = oSandbox.stub(this.oMiniMenuPlugin, "_addSubMenu");
			oSandbox.stub(this.oDesignTime, "getPlugins").returns(aPlugins);
			this.oMiniMenuPlugin.open(oEvent, this.oButton1Overlay, true, false);
			assert.equal(oAddSubMenuStub.callCount, 1, "then _addSubMenu is called");
			assert.equal(oAddSubMenuStub.args[0][0], oSubMenuItem, "then _addMenuItemToGroup is called with the sub menu item");
			oSandbox.restore();
		});
	});
	QUnit.module("MiniMenuControl API", {
		beforeEach: function (assert) {
			var that = this;
			this.oButton1 = new Button();
			this.oButton2 = new Button();
			this.oButtonUnselectable = new Button();
			this.oLayout = new VerticalLayout({
				content: [
					this.oButton1, this.oButton2, this.oButtonUnselectable
				]
			});
			this.oLayout.placeAt("qunit-fixture");
			sap.ui.getCore().applyChanges();
			this.oMenuEntries = {};
			this.oMenuEntries.available = {
				id: "CTX_ALWAYS_THERE",
				text: function () {
					return "item that is always there";
				},
				handler: sinon.spy()
			};
			this.oMenuEntries.alwaysStartSection = {
				id: "CTX_START_SECTION",
				text: "starts new section ",
				rank: 2,
				handler: sinon.spy(),
				startSection: true
			};
			this.oMenuEntries.dynamicTextItem = {
				id: "CTX_DYNAMIC_TEXT",
				text: function () {
					return "Test";
				},
				handler: sinon.spy()
			};
			this.oMiniMenuControl = new MiniMenuControl();
			for (var key in this.oMenuEntries) {
				this.oMiniMenuControl.addButton(this.oMenuEntries[key]);
			}
			var done = assert.async();
			this.oDesignTime = new DesignTime({
				rootElements: [
					this.oLayout
				],
				plugins: []
			});
			this.oDesignTime.attachEventOnce("synced", function () {
				sap.ui.getCore().applyChanges();
				that.oButton1Overlay = OverlayRegistry.getOverlay(that.oButton1);
				that.oButton1Overlay.setSelectable(true);
				that.oButton2Overlay = OverlayRegistry.getOverlay(that.oButton2);
				that.oButton2Overlay.setSelectable(true);
				that.oUnselectableOverlay = OverlayRegistry.getOverlay(that.oButtonUnselectable);
				done();
			});
		},
		afterEach: function () {
			this.oDesignTime.destroy();
			this.oLayout.destroy();
			this.oMiniMenuControl.destroy();
			oSandbox.restore();
		}
	});
	QUnit.test("calling getPopover", function (assert) {
		assert.ok(this.oMiniMenuControl.getPopover() instanceof Popover, "should return a Popover");
	});
	QUnit.test("calling getFlexbox", function (assert) {
		assert.ok(this.oMiniMenuControl.getFlexbox() instanceof FlexBox, "should return a FlexBox");
	});
	QUnit.test("default value of maxButtonsDisplayed", function (assert) {
		sap.ui.test.qunit.triggerMouseEvent(this.oButton2Overlay.getDomRef(), "contextmenu");
		assert.strictEqual(this.oMiniMenuControl.getMaxButtonsDisplayed(), 4, "Should return 4.");
	});
	QUnit.test("setting value of maxButtonsDisplayed", function (assert) {
		sap.ui.test.qunit.triggerMouseEvent(this.oButton2Overlay.getDomRef(), "contextmenu");
		this.oMiniMenuControl.setMaxButtonsDisplayed(19);
		assert.strictEqual(this.oMiniMenuControl.getMaxButtonsDisplayed(), 19, "Should return 19.");
	});
	QUnit.test("setting value of maxButtonsDisplayed to an illegal value", function (assert) {
		sap.ui.test.qunit.triggerMouseEvent(this.oButton2Overlay.getDomRef(), "contextmenu");
		assert.throws(function () {
			this.oMiniMenuControl.setMaxButtonsDisplayed(1);
		}, "Should throw an Error.");
	});
	QUnit.test("adding a button", function (assert) {
		sap.ui.test.qunit.triggerMouseEvent(this.oButton2Overlay.getDomRef(), "contextmenu");
		var oBtn = {
			text: "TestText",
			icon: "",
			handler: function () {}
		};
		assert.strictEqual(this.oMiniMenuControl.addButton(oBtn), this.oMiniMenuControl, "Should return the MiniMenu");
		assert.strictEqual(this.oMiniMenuControl.getFlexbox(true).getItems()[this.oMiniMenuControl.getFlexbox(true).getItems().length - 1].getText(), oBtn.text, "Button should be added to Flexbox 1");
		assert.strictEqual(this.oMiniMenuControl.getFlexbox(true).getItems()[this.oMiniMenuControl.getFlexbox(true).getItems().length - 1].getText(), oBtn.text, "Button should be added to Flexbox 2");
	});
	QUnit.test("removing a button", function (assert) {
		sap.ui.test.qunit.triggerMouseEvent(this.oButton2Overlay.getDomRef(), "contextmenu");
		var oRemovedButton = this.oMiniMenuControl.removeButton(0);
		var aItems = this.oMiniMenuControl.getFlexbox(true).getItems();
		var aItems2 = this.oMiniMenuControl.getFlexbox(false).getItems();
		for (var i0 = 0; i0 < aItems.length; i0++) {
			if (aItems[i0] === oRemovedButton) {
				assert.ok(false, "didn't remove the button");
			}
		}
		for (var i1 = 0; i1 < aItems2.length; i1++) {
			if (aItems2[i1] === oRemovedButton) {
				assert.ok(false, "didn't remove the button");
			}
		}
		assert.strictEqual(aItems.length, 2, "should remove a button");
		assert.strictEqual(aItems2.length, 2, "should remove a button");
	});
	QUnit.test("removing all buttons", function (assert) {
		sap.ui.test.qunit.triggerMouseEvent(this.oButton2Overlay.getDomRef(), "contextmenu");
		this.oMiniMenuControl.removeAllButtons();
		assert.strictEqual(this.oMiniMenuControl.getDependents()[0].getContent()[0].getItems().length, 0, "should remove all buttons");
	});
	QUnit.test("getting all buttons", function (assert) {
		assert.strictEqual(this.oMiniMenuControl.getButtons().length, 3, "Should return the number of buttons");
	});
	QUnit.test("Inserting a button", function (assert) {
		assert.strictEqual(this.oMiniMenuControl.insertButton(new Button({
			text: "abc"
		}), 1), this.oMiniMenuControl, "Should return the MiniMenu");
		assert.strictEqual(this.oMiniMenuControl.getButtons()[1].getText(), "abc", "Should return the text of the inserted button");
	});
	QUnit.test("Calling _setFocusOnNextButton", function (assert) {
		var oTestButton1 = new Button({}).placeAt("qunit-fixture");
		var oTestButton2 = new Button({}).placeAt("qunit-fixture");
		var oTestButton3 = new Button({}).placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();
		oTestButton1.focus();
		this.oMiniMenuControl._setFocusOnNextButton([oTestButton1, oTestButton2, oTestButton3], 0);
		assert.strictEqual(document.activeElement.id, oTestButton2.getId(), "Focus should be at second button");
		this.oMiniMenuControl._setFocusOnNextButton([oTestButton1, oTestButton2, oTestButton3], 2);
		assert.strictEqual(document.activeElement.id, oTestButton1.getId(), "Focus should be at first button");
	});
	QUnit.test("Calling _setFocusOnPreviousButton", function (assert) {
		var oTestButton1 = new Button({}).placeAt("qunit-fixture");
		var oTestButton2 = new Button({}).placeAt("qunit-fixture");
		var oTestButton3 = new Button({}).placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();
		oTestButton1.focus();
		this.oMiniMenuControl._setFocusOnPreviousButton([oTestButton1, oTestButton2, oTestButton3], 1);
		assert.strictEqual(document.activeElement.id, oTestButton1.getId(), "Focus should be at second button");
		this.oMiniMenuControl._setFocusOnPreviousButton([oTestButton1, oTestButton2, oTestButton3], 0);
		assert.strictEqual(document.activeElement.id, oTestButton3.getId(), "Focus should be at first button");
	});
	QUnit.test("Calling _changeFocusOnButtons", function (assert) {
		var oTestBtn = new Button({}).placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();
		var nextSpy = sinon.spy(this.oMiniMenuControl, "_setFocusOnNextButton");
		var prevSpy = sinon.spy(this.oMiniMenuControl, "_setFocusOnPreviousButton");
		this.oMiniMenuControl.show(oTestBtn, false);
		var sId = this.oMiniMenuControl.getButtons()[0].getId();
		this.oMiniMenuControl._changeFocusOnButtons(sId);
		sinon.assert.calledOnce(nextSpy);
		sinon.assert.notCalled(prevSpy);
		nextSpy.reset();
		prevSpy.reset();
		this.oMiniMenuControl._changeFocusOnButtons(sId, true);
		sinon.assert.notCalled(nextSpy);
		sinon.assert.calledOnce(prevSpy);
		nextSpy = null;
		prevSpy = null;
	});
	QUnit.test("calling _getOverlayDimensions", function (assert) {
		jQuery("#qunit-fixture").append("<div id=\"fakeOverlay\" style=\"width:10px; height:12px; position: absolute; top:3px; left:5px;\" />");
		var oOverlay = this.oMiniMenuControl._getOverlayDimensions("fakeOverlay");
		assert.strictEqual(typeof oOverlay.top, "number", "top should be a number");
		assert.ok(!isNaN(oOverlay.top), "top shouldn't be NaN");
		assert.strictEqual(typeof oOverlay.left, "number", "left should be a number");
		assert.ok(!isNaN(oOverlay.left), "left shouldn't be NaN");
		assert.strictEqual(typeof oOverlay.width, "number", "width should be a number");
		assert.ok(!isNaN(oOverlay.width), "width shouldn't be NaN");
		assert.strictEqual(typeof oOverlay.height, "number", "heigth should be a number");
		assert.ok(!isNaN(oOverlay.height), "height shouldn't be NaN");
		assert.strictEqual(typeof oOverlay.right, "number", "right should be a number");
		assert.ok(!isNaN(oOverlay.right), "right shouldn't be NaN");
		assert.strictEqual(oOverlay.right, oOverlay.left + oOverlay.width, "right  should be equal to left + width");
		assert.strictEqual(typeof oOverlay.bottom, "number", "bottom should be a number");
		assert.ok(!isNaN(oOverlay.bottom), "bottom shouldn't be NaN");
		assert.strictEqual(oOverlay.bottom, oOverlay.top + oOverlay.height, "bottom should be equal to top + height");
	});
	QUnit.test("calling _getViewportDimensions", function (assert) {
		var oViewport = this.oMiniMenuControl._getViewportDimensions();
		assert.strictEqual(typeof oViewport.top, "number", "top should be a number");
		assert.ok(!isNaN(oViewport.top), "top shouldn't be NaN");
		assert.strictEqual(typeof oViewport.bottom, "number", "bottom should be a number");
		assert.ok(!isNaN(oViewport.bottom), "bottrop shouldn't be NaN");
		assert.strictEqual(oViewport.bottom, oViewport.top + oViewport.height, "bottom should be equal to top + height");
		assert.strictEqual(typeof oViewport.width, "number", "width should be a number");
		assert.ok(!isNaN(oViewport.width), "width shouldn't be NaN");
		assert.strictEqual(typeof oViewport.height, "number", "height should be a number");
		assert.ok(!isNaN(oViewport.height), "height shouldn't be NaN");
	});
	QUnit.test("calling _getMiddleOfOverlayAndViewportEdges", function (assert) {
		var oOverlay = {
			top: 10,
			bottom: 20
		};
		var oViewport = {
			top: 0,
			bottom: 30
		};
		var iTop = this.oMiniMenuControl._getMiddleOfOverlayAndViewportEdges(oOverlay, oViewport);
		assert.strictEqual(iTop, 15, "entire overlay inside of viewport");
		oOverlay = {
			top: 0,
			bottom: 20
		};
		oViewport = {
			top: 10,
			bottom: 30
		};
		iTop = this.oMiniMenuControl._getMiddleOfOverlayAndViewportEdges(oOverlay, oViewport);
		assert.strictEqual(iTop, 15, "top of overlay outside of viewport");
		oOverlay = {
			top: 10,
			bottom: 30
		};
		oViewport = {
			top: 0,
			bottom: 20
		};
		iTop = this.oMiniMenuControl._getMiddleOfOverlayAndViewportEdges(oOverlay, oViewport);
		assert.strictEqual(iTop, 15, "bottom of overlay outside of viewport");
		oOverlay = {
			top: 0,
			bottom: 30
		};
		oViewport = {
			top: 10,
			bottom: 20
		};
		iTop = this.oMiniMenuControl._getMiddleOfOverlayAndViewportEdges(oOverlay, oViewport);
		assert.strictEqual(iTop, 15, "top and bottom of overlay outside of viewport");
		oOverlay = null;
		oViewport = null;
		iTop = null;
	});
	QUnit.test("calling _getMiniMenuSidewaysPlacement", function (assert) {
		var oOverlay = {
			right: 60
		};
		var oPopover = {
			width: 20
		};
		var oViewport = {
			width: 100
		};
		var iLeft = this.oMiniMenuControl._getMiniMenuSidewaysPlacement(oOverlay, oPopover, oViewport);
		assert.strictEqual(iLeft, 60, "There is enough space on the right");
		assert.strictEqual(this.oMiniMenuControl.getPopover().getPlacement(), "Right", "Placment should be Right");
		oOverlay = {
			left: 40
		};
		oPopover = {
			width: 20
		};
		oViewport = {};
		iLeft = this.oMiniMenuControl._getMiniMenuSidewaysPlacement(oOverlay, oPopover, oViewport);
		assert.strictEqual(iLeft, 40, "There is enough space on the left");
		assert.strictEqual(this.oMiniMenuControl.getPopover().getPlacement(), "Left", "Placment should be Right");
		oOverlay = {
			left: 22,
			width: 40
		};
		oPopover = {
			width: 30
		};
		oViewport = {
			width: 80
		};
		iLeft = this.oMiniMenuControl._getMiniMenuSidewaysPlacement(oOverlay, oPopover, oViewport);
		assert.strictEqual(iLeft, 42, "The MiniMenu can be opened to the right from the center of the overlay");
		assert.strictEqual(this.oMiniMenuControl.getPopover().getPlacement(), "Right", "Placment should be Right");
		oOverlay = {
			left: 22,
			width: 40
		};
		oPopover = {
			width: 50
		};
		oViewport = {
			width: 80
		};
		iLeft = this.oMiniMenuControl._getMiniMenuSidewaysPlacement(oOverlay, oPopover, oViewport);
		assert.strictEqual(iLeft, 30, "The MiniMenu can be opened to the right from some place left of the center of the overlay");
		assert.strictEqual(this.oMiniMenuControl.getPopover().getPlacement(), "Right", "Placment should be Right");
		oOverlay = null;
		oPopover = null;
		oViewport = null;
		iLeft = null;
	});
	QUnit.test("calling _placeMiniMenuSideways", function (assert) {
		var oOverlay = {
			right: 60,
			top: 10,
			bottom: 20
		};
		var oPopover = {
			width: 20
		};
		var oViewport = {
			top: 0,
			bottom: 30,
			width: 100
		};
		var spy1 = sinon.spy(this.oMiniMenuControl, "_getMiddleOfOverlayAndViewportEdges");
		var spy2 = sinon.spy(this.oMiniMenuControl, "_getMiniMenuSidewaysPlacement");
		this.oMiniMenuControl._placeMiniMenuSideways(oOverlay, oPopover, oViewport);
		sinon.assert.calledOnce(spy1);
		sinon.assert.calledOnce(spy2);
		oOverlay = null;
		oPopover = null;
		oViewport = null;
		spy1 = null;
		spy2 = null;
	});
	QUnit.test("calling _placeMiniMenuAtTheBottom", function (assert) {
		var oOverlay = {
			left: 20,
			width: 30,
			height: 30,
			bottom: 90,
			top: 60
		};
		var oPopover = {
			height: 60
		};
		var oViewport = {
			height: 200
		};
		var oPos = this.oMiniMenuControl._placeMiniMenuAtTheBottom(oOverlay, oPopover, oViewport);
		assert.strictEqual(oPos.top, 90, "Should be at the bottom of the overlay");
		assert.strictEqual(oPos.left, 35, "Should be the middle of the overlay");
		oOverlay = {
			top: 60,
			height: 30
		};
		oPopover = {};
		oViewport = {
			top: 0
		};
		oPos = this.oMiniMenuControl._placeMiniMenuAtTheBottom(oOverlay, oPopover, oViewport);
		assert.strictEqual(oPos.top, 65, "Should be 5 bellow the top of the overlay");
		oOverlay = {
			top: 60
		};
		oPopover = {};
		oViewport = {
			top: 0
		};
		oPos = this.oMiniMenuControl._placeMiniMenuAtTheBottom(oOverlay, oPopover, oViewport);
		assert.strictEqual(oPos.top, 65, "Should be 5 bellow the top of the overlay");
		oOverlay = {
			top: 60
		};
		oPopover = {
			height: 60
		};
		oViewport = {
			top: 80
		};
		oPos = this.oMiniMenuControl._placeMiniMenuAtTheBottom(oOverlay, oPopover, oViewport);
		assert.strictEqual(oPos.top, 85, "Should be 5 bellow the top of the viewport");
		oOverlay = null;
		oPopover = null;
		oViewport = null;
		oPos = null;
	});
	QUnit.test("calling _placeMiniMenuOnTop", function (assert) {
		var oOverlay = {
			top: 100,
			left: 20,
			width: 30
		};
		var oPos = this.oMiniMenuControl._placeMiniMenuOnTop(oOverlay);
		assert.strictEqual(oPos.top, 100, "Should be the top of the overlay");
		assert.strictEqual(oPos.left, 35, "Should be the middle of the overlay");
		oOverlay = null;
		oPos = null;
	});
	QUnit.test("calling _placeAsMiniMenu", function (assert) {
		var oOverlay = {
			top: 100
		};
		var oPopover = {
			height: 50,
			width: 40
		};
		var oViewport = {
			width: 100
		};
		var spyTop = sinon.spy(this.oMiniMenuControl, "_placeMiniMenuOnTop");
		var spyBottom = sinon.spy(this.oMiniMenuControl, "_placeMiniMenuAtTheBottom");
		var spySideways = sinon.spy(this.oMiniMenuControl, "_placeMiniMenuSideways");
		this.oMiniMenuControl._placeAsMiniMenu(oOverlay, oPopover, oViewport);
		sinon.assert.calledOnce(spyTop);
		sinon.assert.notCalled(spyBottom);
		sinon.assert.notCalled(spySideways);
		assert.strictEqual(this.oMiniMenuControl.getPopover().getShowArrow(), true, "Arrow should be visible");
		oOverlay = {
			top: 50
		};
		oPopover = {
			height: 60,
			width: 40
		};
		oViewport = {
			height: 200,
			width: 200
		};
		spyTop.reset();
		spyBottom.reset();
		spySideways.reset();
		this.oMiniMenuControl._placeAsMiniMenu(oOverlay, oPopover, oViewport);
		sinon.assert.notCalled(spyTop);
		sinon.assert.calledOnce(spyBottom);
		sinon.assert.notCalled(spySideways);
		oOverlay = {};
		oPopover = {
			height: 50,
			width: 40
		};
		oViewport = {
			height: 100,
			width: 100
		};
		spyTop.reset();
		spyBottom.reset();
		spySideways.reset();
		this.oMiniMenuControl._placeAsMiniMenu(oOverlay, oPopover, oViewport);
		sinon.assert.notCalled(spyTop);
		sinon.assert.notCalled(spyBottom);
		sinon.assert.calledOnce(spySideways);
		oOverlay = {};
		oPopover = {
			height: 270,
			width: 40
		};
		oViewport = {
			height: 200,
			width: 200
		};
		spyTop.reset();
		spyBottom.reset();
		spySideways.reset();
		assert.throws(this.oMiniMenuControl._placeAsMiniMenu.bind(this.oMiniMenuControl, oOverlay, oPopover, oViewport), Error("Your screen size is not supported!"), "Should throw an error");
		sinon.assert.notCalled(spyTop);
		sinon.assert.notCalled(spyBottom);
		sinon.assert.notCalled(spySideways);
		oOverlay = null;
		oPopover = null;
		oViewport = null;
		spyTop = null;
		spyBottom = null;
		spySideways = null;
	});
	QUnit.test("calling _placeAsContextMenu", function (assert) {
		var oContPos = {
			x: 90,
			y: 80
		};
		var oPopover = {
			width: 40,
			height: 60
		};
		var oViewport = {
			width: 200,
			height: 200
		};
		var oPos = this.oMiniMenuControl._placeAsContextMenu(oContPos, oPopover, oViewport);
		assert.strictEqual(oPos.top, 80, "should be the y coordinate of the context menu position");
		assert.strictEqual(oPos.left, 90, "should be the x coordinate of the context menu position");
		assert.strictEqual(this.oMiniMenuControl.getPopover().getPlacement(), "Bottom", "placement should be Bottom");
		assert.strictEqual(this.oMiniMenuControl.getPopover().getShowArrow(), false, "Arrow shouldn't be visible");
		oContPos = {
			x: 180,
			y: 160
		};
		oPopover = {
			width: 40,
			height: 60
		};
		oViewport = {
			width: 200,
			height: 200
		};
		oPos = this.oMiniMenuControl._placeAsContextMenu(oContPos, oPopover, oViewport);
		assert.strictEqual(oPos.top, 160, "should be the y coordinate of the context menu position");
		assert.strictEqual(oPos.left, 140, "should be oContPos.x - oPopover.width");
		assert.strictEqual(this.oMiniMenuControl.getPopover().getPlacement(), "Top", "placement should be Top");
		oContPos = {
			x: 50,
			y: 60
		};
		oPopover = {
			width: 60,
			height: 80
		};
		oViewport = {
			width: 100,
			height: 100
		};
		oPos = this.oMiniMenuControl._placeAsContextMenu(oContPos, oPopover, oViewport);
		assert.strictEqual(oPos.top, 20, "should be oViewport.height - oContPos.y");
		assert.strictEqual(oPos.left, 40, "should be oViewport.width - oContPos.x");
		assert.strictEqual(this.oMiniMenuControl.getPopover().getPlacement(), "Bottom", "placement should be Bottom");
		oContPos = {
			x: 40,
			y: 60
		};
		oPopover = {
			width: 60,
			height: 80
		};
		oViewport = {
			width: 50,
			height: 200
		};
		assert.throws(this.oMiniMenuControl._placeAsContextMenu.bind(this.oMiniMenuControl, oContPos, oPopover, oViewport), Error("Your screen size is not supported!"), "Should throw an error");
		oContPos = {
			x: 60,
			y: 40
		};
		oPopover = {
			width: 60,
			height: 80
		};
		oViewport = {
			width: 200,
			height: 50
		};
		assert.throws(this.oMiniMenuControl._placeAsContextMenu.bind(this.oMiniMenuControl, oContPos, oPopover, oViewport), Error("Your screen size is not supported!"), "Should throw an error");
		oContPos = null;
		oPopover = null;
		oViewport = null;
		oPos = null;
	});
	QUnit.test("calling _placeMiniMenu", function (assert) {
		this.oMiniMenuControl._oContextMenuPosition = {
			x: 314,
			y: 42
		};
		this.oMiniMenuControl.addButton({
			text: "button",
			handler: function () {
				return undefined;
			},
			id: "newButton0"
		});
		var spyContext = sinon.spy(this.oMiniMenuControl, "_placeAsContextMenu");
		var spyMini = sinon.spy(this.oMiniMenuControl, "_placeAsMiniMenu");
		var oFakeDiv = this.oMiniMenuControl._placeMiniMenu(this.oButton2Overlay, true, true);
		assert.ok(oFakeDiv instanceof Element, "should return an HTML Element");
		assert.strictEqual(oFakeDiv.getAttribute("overlay"), this.oButton2Overlay.getId(), "the fakeDiv should have an overlay attribute containing the id of the original overlay");
		assert.strictEqual(oFakeDiv.getAttribute("id"), "fakeDiv", "the fakeDiv should have the id \"fakeDiv\"");
		assert.strictEqual(oFakeDiv, jQuery("#" + this.oButton2Overlay.getId()).children()[1], "the fakeDiv should be a child of the overlay the MiniMenu was placed by");
		sinon.assert.calledOnce(spyContext);
		sinon.assert.notCalled(spyMini);
		spyContext.reset();
		spyMini.reset();
		this.oMiniMenuControl._iButtonsVisible = 3;
		this.oMiniMenuControl._placeMiniMenu(this.oButton2Overlay, false, false);
		sinon.assert.calledOnce(spyMini);
		sinon.assert.notCalled(spyContext);
		spyContext = null;
		spyMini = null;
		oFakeDiv = null;
	});
	QUnit.test("calling _placeMiniMenuWrapper", function (assert) {
		var oBtn = new Button({}).placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();
		this.oMiniMenuControl.show(oBtn, false);
		this.oMiniMenuControl._placeMiniMenuWrapper();
		var oMiniMenuWrapper = document.getElementById("MiniMenuWrapper");
		assert.ok(oMiniMenuWrapper instanceof Element, "The MiniMenu wrapper should be an Element in the DOM");
		oBtn = null;
	});
	QUnit.test("comparing the height of an actual rendered sap.m.Button to the return value of _getButtonHeight", function (assert) {
		var oCozyBtn = new Button({
			icon: "sap-icon://fridge",
			text: "Cozy Button"
		}).placeAt("qunit-fixture");
		var oCompactBtn = new Button({
			icon: "sap-icon://dishwasher",
			text: "Compact Button"
		}).placeAt("compact-fixture");
		sap.ui.getCore().applyChanges();
		var fCalculatedCozyHeight = this.oMiniMenuControl._getButtonHeight(false);
		var fMeasuredCozyHeight = parseInt(jQuery(oCozyBtn.getDomRef()).css("height"), 10) / 16;
		var fCalculatedCompactHeight = this.oMiniMenuControl._getButtonHeight(true);
		var fMeasuredCompactHeight = parseInt(jQuery(oCompactBtn.getDomRef()).css("height"), 10) / 16;
		assert.strictEqual(fCalculatedCozyHeight, fMeasuredCozyHeight, "To prevent rendering the MiniMenu a bunch of times its height is calculated based on the css values of sap.m.Button. If this test fails the css values of sap.m.Buttons may have changed. Please run this test again to make sure it didn't fail randomly. If it fails again the return value of _getButtonHeight (for bCompact = false) has to be adjusted to whatever the expected value was in this test.");
		assert.strictEqual(fCalculatedCompactHeight, fMeasuredCompactHeight, "To prevent rendering the MiniMenu a bunch of times height size is calculated based on the css values of sap.m.Button. If this test fails the css values of sap.m.Buttons may have changed. Please run this test again to make sure it didn't fail randomly. If it fails again the return value of _getButtonHeight (for bCompact = true) has to be adjusted to whatever the expected value was in this test.");
		oCozyBtn = null;
		oCompactBtn = null;
		fCalculatedCozyHeight = null;
		fMeasuredCozyHeight = null;
		fCalculatedCompactHeight = null;
		fMeasuredCompactHeight = null;
	});
	QUnit.test("comparing the width of an actual rendered sap.m.Button (icon only) to the return value of _getButtonWidth", function (assert) {
		var oCozyBtn = new Button({
			icon: "sap-icon://fridge"
		}).placeAt("qunit-fixture");
		var oCompactBtn = new Button({
			icon: "sap-icon://dishwasher"
		}).placeAt("compact-fixture");
		sap.ui.getCore().applyChanges();
		var fCalculatedCozyWidth = this.oMiniMenuControl._getButtonWidth(false);
		var fMeasuredCozyWidth = parseInt(jQuery(oCozyBtn.getDomRef()).css("width"), 10) / 16;
		var fCalculatedCompactWidth = this.oMiniMenuControl._getButtonWidth(true);
		var fMeasuredCompactWidth = parseInt(jQuery(oCompactBtn.getDomRef()).css("width"), 10) / 16;
		assert.strictEqual(fCalculatedCozyWidth, fMeasuredCozyWidth, "To prevent rendering the MiniMenu a bunch of times its width is calculated based on the css values of sap.m.Button. If this test fails the css values of sap.m.Buttons may have changed. Please run this test again to make sure it didn't fail randomly. If it fails again the return value of _getButtonWidth (for bCompact = false) has to be adjusted to whatever the expected value was in this test.");
		assert.strictEqual(fCalculatedCompactWidth, fMeasuredCompactWidth, "To prevent rendering the MiniMenu a bunch of times its width is calculated based on the css values of sap.m.Button. If this test fails the css values of sap.m.Buttons may have changed. Please run this test again to make sure it didn't fail randomly. If it fails again the return value of _getButtonWidth (for bCompact = true) has to be adjusted to whatever the expected value was in this test.");
		oCozyBtn = null;
		oCompactBtn = null;
		fCalculatedCozyWidth = null;
		fMeasuredCozyWidth = null;
		fCalculatedCompactWidth = null;
		fMeasuredCompactWidth = null;
	});
	QUnit.test("comparing the height of the arrow of an actual rendered sap.m.Popover to the return value of _getArrowHeight", function (assert) {
		var oCozyBtn = new Button({
			icon: "sap-icon://fridge"
		}).placeAt("qunit-fixture");
		var oCompactBtn = new Button({
			icon: "sap-icon://dishwasher"
		}).placeAt("compact-fixture");
		sap.ui.getCore().applyChanges();
		var oCozyPop = new Popover({
			placement: "Bottom"
		}).openBy(oCozyBtn);
		var oCompactPop = new Popover({
			placement: "Bottom"
		}).openBy(oCompactBtn);
		var fCalculatedCozyArrowSize = this.oMiniMenuControl._getArrowHeight(false);
		var fMeasuredCozyArrowSize = parseInt(jQuery("#" + oCozyPop.getId() + "-arrow").css("height"), 10) / 16;
		var fCalculatedCompactArrowSize = this.oMiniMenuControl._getArrowHeight(true);
		var fMeasuredCompactArrowSize = parseInt(jQuery("#" + oCompactPop.getId() + "-arrow").css("height"), 10) / 16;
		oCozyPop.close();
		oCompactPop.close();
		assert.strictEqual(fCalculatedCozyArrowSize, fMeasuredCozyArrowSize, "To prevent rendering the MiniMenu a bunch of times the size of the Popover's Arrow is calculated based on the css values of sap.m.Popover. If this test fails the css values of sap.m.Popover may have changed. Please run this test again to make sure it didn't fail randomly. If it fails again the return value of _getArrowHeight (for bCompact = false) has to be adjusted to whatever the expected value was in this test.");
		assert.strictEqual(fCalculatedCompactArrowSize, fMeasuredCompactArrowSize, "To prevent rendering the MiniMenu a bunch of times the size of the Popover's Arrow is calculated based on the css values of sap.m.Popover. If this test fails the css values of sap.m.Popover may have changed. Please run this test again to make sure it didn't fail randomly. If it fails again the return value of _getArrowHeight (for bCompact = true) has to be adjusted to whatever the expected value was in this test.");
		oCozyBtn = null;
		oCompactBtn = null;
		oCozyPop = null;
		oCompactPop = null;
		fCalculatedCozyArrowSize = null;
		fMeasuredCozyArrowSize = null;
		fCalculatedCompactArrowSize = null;
		fMeasuredCompactArrowSize = null;
	});
	QUnit.test("calling _getBaseFontSize", function (assert) {
		var iBaseFontSize = this.oMiniMenuControl._getBaseFontSize();
		assert.strictEqual(typeof iBaseFontSize, "number", "The base font size should be a number.");
		assert.ok(!isNaN(iBaseFontSize), "The base font size shouldn't be NaN.");
		iBaseFontSize = null;
	});
	QUnit.test("calling _makeAllButtonsVisible", function (assert) {
		var aButtons = [
			new OverflowToolbarButton({
				text: "Button 0",
				visible: false
			}),
			new OverflowToolbarButton({
				text: "Button 1",
				visible: false
			}),
			new OverflowToolbarButton({
				text: "Button 2",
				visible: false
			}),
			new OverflowToolbarButton({
				text: "Button 3",
				visible: false
			}),
			new OverflowToolbarButton({
				text: "Button 4",
				visible: false
			}),
			new OverflowToolbarButton({
				text: "Button 5",
				visible: false
			})
		];
		this.oMiniMenuControl._makeAllButtonsVisible(aButtons);
		for (var i = 0; i < aButtons.length; i++) {
			assert.strictEqual(aButtons[i].getVisible(), true, "Button " + i + " should be visible.");
			assert.strictEqual(aButtons[i].getText(), "Button " + i, "Text should be Button " + i + ".");
			assert.strictEqual(aButtons[i]._bInOverflow, true, "_bInOverflow of Button " + i + " should be true.");
		}
		aButtons = null;
	});
	QUnit.test("calling _getNumberOfEnabledButtons", function (assert) {
		var aButtons = [
			new OverflowToolbarButton({
				text: "Button 0",
				visible: true,
				enabled: true
			}),
			new OverflowToolbarButton({
				text: "Button 1",
				visible: true,
				enabled: false
			}),
			new OverflowToolbarButton({
				text: "Button 2",
				visible: true,
				enabled: true
			}),
			new OverflowToolbarButton({
				text: "Button 3",
				visible: true,
				enabled: false
			}),
			new OverflowToolbarButton({
				text: "Button 4",
				visible: true,
				enabled: true
			}),
			new OverflowToolbarButton({
				text: "Button 5",
				visible: true,
				enabled: true
			})
		];
		var iEnabledButtons = this.oMiniMenuControl._getNumberOfEnabledButtons(aButtons);
		assert.strictEqual(iEnabledButtons, 4, "4 buttons should be enabled");
		iEnabledButtons = null;
		aButtons = null;
	});
	QUnit.test("calling _hideDisabledButtons", function (assert) {
		var aButtons = [
			new OverflowToolbarButton({
				text: "Button 0",
				visible: true,
				enabled: true
			}),
			new OverflowToolbarButton({
				text: "Button 1",
				visible: true,
				enabled: false
			}),
			new OverflowToolbarButton({
				text: "Button 2",
				visible: true,
				enabled: true
			}),
			new OverflowToolbarButton({
				text: "Button 3",
				visible: true,
				enabled: false
			}),
			new OverflowToolbarButton({
				text: "Button 4",
				visible: true,
				enabled: false
			}),
			new OverflowToolbarButton({
				text: "Button 5",
				visible: true,
				enabled: true
			})
		];
		var iVisibleButtons = this.oMiniMenuControl._hideDisabledButtons(aButtons);
		assert.strictEqual(iVisibleButtons, 3, "3 Buttons should be visible");
		for (var i = 0; i < aButtons.length; i++) {
			assert.strictEqual(aButtons[i].getVisible(), aButtons[i].getEnabled(), "Enabled Buttons should be visible. Disabled Buttons should be hidden");
		}
		iVisibleButtons = null;
		aButtons = null;
	});
	QUnit.test("calling _hideButtonsInOverflow", function (assert) {
		var aButtons = [
			new OverflowToolbarButton({
				text: "Button 0",
				visible: true,
				enabled: true
			}),
			new OverflowToolbarButton({
				text: "Button 1",
				visible: false,
				enabled: false
			}),
			new OverflowToolbarButton({
				text: "Button 2",
				visible: true,
				enabled: true
			}),
			new OverflowToolbarButton({
				text: "Button 3",
				visible: true,
				enabled: true
			}),
			new OverflowToolbarButton({
				text: "Button 4",
				visible: false,
				enabled: false
			}),
			new OverflowToolbarButton({
				text: "Button 5",
				visible: true,
				enabled: true
			}),
			new OverflowToolbarButton({
				text: "Button 6",
				visible: true,
				enabled: true
			}),
			new OverflowToolbarButton({
				text: "Button 7",
				visible: true,
				enabled: true
			})
		];
		var iVisibleButtons = this.oMiniMenuControl._hideButtonsInOverflow(aButtons);
		assert.strictEqual(iVisibleButtons, 4, "4 Buttons should be visible");
		assert.strictEqual(aButtons[0].getVisible(), true, "should be visible");
		assert.strictEqual(aButtons[1].getVisible(), false, "should be hidden");
		assert.strictEqual(aButtons[2].getVisible(), true, "should be visible");
		assert.strictEqual(aButtons[3].getVisible(), true, "should be visible");
		assert.strictEqual(aButtons[4].getVisible(), false, "should be hidden");
		assert.strictEqual(aButtons[5].getVisible(), true, "should be visible");
		assert.strictEqual(aButtons[6].getVisible(), false, "should be hidden");
		assert.strictEqual(aButtons[7].getVisible(), false, "should be hidden");
		iVisibleButtons = null;
		aButtons = null;
	});
	QUnit.test("calling _hideButtonsInOverflow when no buttons are in overflow", function (assert) {
		var aButtons = [
			new OverflowToolbarButton({
				text: "Button 0",
				visible: true
			}),
			new OverflowToolbarButton({
				text: "Button 1",
				visible: true
			}),
			new OverflowToolbarButton({
				text: "Button 2",
				visible: true
			}),
			new OverflowToolbarButton({
				text: "Button 3",
				visible: true
			})
		];
		var iVisibleButtons = this.oMiniMenuControl._hideButtonsInOverflow(aButtons);
		assert.strictEqual(iVisibleButtons, 4, "4 Buttons should be visible");
		for (var i = 0; i < aButtons.length; i++) {
			assert.strictEqual(aButtons[i].getVisible(), true, "Button " + i + " should be visible");
		}
		iVisibleButtons = null;
		aButtons = null;
	});
	QUnit.test("calling _replaceLastVisibleButtonWithOverflowButton", function (assert) {
		var aButtons = [
			new OverflowToolbarButton({
				text: "Button 0",
				visible: true,
				enabled: true
			}),
			new OverflowToolbarButton({
				text: "Button 1",
				visible: false,
				enabled: false
			}),
			new OverflowToolbarButton({
				text: "Button 2",
				visible: true,
				enabled: true
			}),
			new OverflowToolbarButton({
				text: "Button 3",
				visible: true,
				enabled: true
			}),
			new OverflowToolbarButton({
				text: "Button 4",
				visible: false,
				enabled: false
			}),
			new OverflowToolbarButton({
				text: "Button 5",
				visible: true,
				enabled: true
			}),
			new OverflowToolbarButton({
				text: "Button 6",
				visible: false,
				enabled: true
			}),
			new OverflowToolbarButton({
				text: "Button 7",
				visible: false,
				enabled: true
			})
		];
		this.oMiniMenuControl._replaceLastVisibleButtonWithOverflowButton(aButtons);
		assert.strictEqual(aButtons[5].getVisible(), false, "should be hidden");
		var oLastButton = this.oMiniMenuControl.getButtons()[this.oMiniMenuControl.getButtons().length - 1];
		assert.strictEqual(oLastButton.getIcon(), "sap-icon://overflow", "Last Button should be the Overflow Button.");
		oLastButton = null;
		aButtons = null;
	});
	QUnit.test("calling _setButtonsForMiniMenu with 3 disabled Buttons", function (assert) {
		var aButtons = [
			new OverflowToolbarButton({
				text: "Button 0",
				enabled: false
			}),
			new OverflowToolbarButton({
				text: "Button 1",
				enabled: false
			}),
			new OverflowToolbarButton({
				text: "Button 2",
				enabled: false
			})
		];
		var spyEnabledButtons = sinon.spy(this.oMiniMenuControl, "_getNumberOfEnabledButtons");
		var spyHideDisabled = sinon.spy(this.oMiniMenuControl, "_hideDisabledButtons");
		var spyHideInOverflow = sinon.spy(this.oMiniMenuControl, "_hideButtonsInOverflow");
		var spyReplaceLast = sinon.spy(this.oMiniMenuControl, "_replaceLastVisibleButtonWithOverflowButton");
		var spyCreateOverflow = sinon.spy(this.oMiniMenuControl, "_createOverflowButton");
		this.oMiniMenuControl._setButtonsForMiniMenu(aButtons, new Button({
			id: "btn0_"
		}));
		for (var i = 0; i < aButtons.length; i++) {
			assert.notEqual(aButtons[i].getTooltip(), "", "ToolTip shouldn't be empty string");
		}
		sinon.assert.calledOnce(spyEnabledButtons);
		sinon.assert.notCalled(spyHideDisabled);
		sinon.assert.calledOnce(spyHideInOverflow);
		sinon.assert.notCalled(spyReplaceLast);
		sinon.assert.notCalled(spyCreateOverflow);
		aButtons = null;
		spyEnabledButtons = null;
		spyHideDisabled = null;
		spyHideInOverflow = null;
		spyReplaceLast = null;
		spyCreateOverflow = null;
	});
	QUnit.test("calling _setButtonsForMiniMenu with 2 enabled and 2 disabled buttons", function (assert) {
		var aButtons = [
			new OverflowToolbarButton({
				text: "Button 0",
				enabled: false
			}),
			new OverflowToolbarButton({
				text: "Button 1",
				enabled: true
			}),
			new OverflowToolbarButton({
				text: "Button 2",
				enabled: false
			}),
			new OverflowToolbarButton({
				text: "Button 3",
				enabled: true
			})
		];
		var spyEnabledButtons = sinon.spy(this.oMiniMenuControl, "_getNumberOfEnabledButtons");
		var spyHideDisabled = sinon.spy(this.oMiniMenuControl, "_hideDisabledButtons");
		var spyHideInOverflow = sinon.spy(this.oMiniMenuControl, "_hideButtonsInOverflow");
		var spyReplaceLast = sinon.spy(this.oMiniMenuControl, "_replaceLastVisibleButtonWithOverflowButton");
		var spyCreateOverflow = sinon.spy(this.oMiniMenuControl, "_createOverflowButton");
		this.oMiniMenuControl._setButtonsForMiniMenu(aButtons, new Button({
			id: "btn1_"
		}));
		sinon.assert.calledOnce(spyEnabledButtons);
		sinon.assert.calledOnce(spyHideDisabled);
		sinon.assert.calledOnce(spyHideInOverflow);
		sinon.assert.notCalled(spyReplaceLast);
		sinon.assert.calledOnce(spyCreateOverflow);
		aButtons = null;
		spyEnabledButtons = null;
		spyHideDisabled = null;
		spyHideInOverflow = null;
		spyReplaceLast = null;
		spyCreateOverflow = null;
	});
	QUnit.test("calling _setButtonsForMiniMenu with 3 enabled and 1 disabled buttons", function (assert) {
		this.oMiniMenuControl.setMaxButtonsDisplayed(3);
		var aButtons = [
			new OverflowToolbarButton({
				text: "Button 0",
				enabled: true
			}),
			new OverflowToolbarButton({
				text: "Button 1",
				enabled: true
			}),
			new OverflowToolbarButton({
				text: "Button 2",
				enabled: true
			}),
			new OverflowToolbarButton({
				text: "Button 3",
				enabled: false
			})
		];
		var spyEnabledButtons = sinon.spy(this.oMiniMenuControl, "_getNumberOfEnabledButtons");
		var spyHideDisabled = sinon.spy(this.oMiniMenuControl, "_hideDisabledButtons");
		var spyHideInOverflow = sinon.spy(this.oMiniMenuControl, "_hideButtonsInOverflow");
		var spyReplaceLast = sinon.spy(this.oMiniMenuControl, "_replaceLastVisibleButtonWithOverflowButton");
		var spyCreateOverflow = sinon.spy(this.oMiniMenuControl, "_createOverflowButton");
		this.oMiniMenuControl._setButtonsForMiniMenu(aButtons, new Button({
			id: "btn2_"
		}));
		sinon.assert.calledOnce(spyEnabledButtons);
		sinon.assert.calledOnce(spyHideDisabled);
		sinon.assert.calledOnce(spyHideInOverflow);
		sinon.assert.calledOnce(spyReplaceLast);
		sinon.assert.calledOnce(spyCreateOverflow);
		aButtons = null;
		spyEnabledButtons = null;
		spyHideDisabled = null;
		spyHideInOverflow = null;
		spyReplaceLast = null;
		spyCreateOverflow = null;
	});
	QUnit.test("calling show with contextMenu = true and contextMenu = false", function (assert) {
		var spyMiniMenu = sinon.spy(this.oMiniMenuControl, "_setButtonsForMiniMenu");
		var spyContextMenu = sinon.spy(this.oMiniMenuControl, "_makeAllButtonsVisible");
		var oBtn = new Button({}).placeAt("qunit-fixture");
		sap.ui.getCore().applyChanges();
		this.oMiniMenuControl.show(oBtn, true, {
			x: 0,
			y: 0
		});
		sinon.assert.notCalled(spyMiniMenu);
		sinon.assert.calledOnce(spyContextMenu);
		spyMiniMenu.reset();
		spyContextMenu.reset();
		this.oMiniMenuControl.show(oBtn, false);
		sinon.assert.calledOnce(spyMiniMenu);
		sinon.assert.notCalled(spyContextMenu);
		spyMiniMenu = null;
		spyContextMenu = null;
	});
	QUnit.test("calling _changeFocusOnKeyStroke", function (assert) {
		this.oButton1Overlay.focus();
		var oEvent = { key: "ArrowRight" };
		var oChangeFocusOnButtonsStub = oSandbox.stub(this.oMiniMenuControl, "_changeFocusOnButtons");
		this.oMiniMenuControl._changeFocusOnKeyStroke(oEvent);
		assert.equal(oChangeFocusOnButtonsStub.callCount, 1, "_changeFocusOnButtons called first");
		assert.equal(oChangeFocusOnButtonsStub.args.length, 1, "_changeFocusOnButtons called with one argument");
		oEvent.key = "ArrowLeft";
		this.oMiniMenuControl._changeFocusOnKeyStroke(oEvent);
		assert.equal(oChangeFocusOnButtonsStub.callCount, 2, "_changeFocusOnButtons called second");
		assert.equal(oChangeFocusOnButtonsStub.args[1].length, 2, "_changeFocusOnButtons called with two arguments");
		oEvent.key = "ArrowUp";
		this.oMiniMenuControl._changeFocusOnKeyStroke(oEvent);
		assert.equal(oChangeFocusOnButtonsStub.callCount, 3, "_changeFocusOnButtons called third");
		assert.equal(oChangeFocusOnButtonsStub.args[2].length, 2, "_changeFocusOnButtons called with two arguments");
		oEvent.key = "ArrowDown";
		this.oMiniMenuControl._changeFocusOnKeyStroke(oEvent);
		assert.equal(oChangeFocusOnButtonsStub.callCount, 4, "_changeFocusOnButtons called fourth");
		assert.equal(oChangeFocusOnButtonsStub.args[3].length, 1, "_changeFocusOnButtons called with one argument");
		oEvent.key = "Tab";
		this.oMiniMenuControl._changeFocusOnKeyStroke(oEvent);
		assert.equal(oChangeFocusOnButtonsStub.callCount, 4, "_changeFocusOnButtons was not called again");
	});
	QUnit.test("calling _onContextMenu (attached at popover)", function(assert) {
		var done = assert.async();
		var oEvent = { preventDefault: function() {
			assert.ok(true, "oEvent.preventDefault is called");
			done();
		}};
		this.oMiniMenuControl._onContextMenu(oEvent);
	});
	QUnit.module("MiniMenuControl API", {
		beforeEach: function (assert) {
		},
		afterEach: function () {
			oSandbox.restore();
		}
	}, function() {
		QUnit.test("when instantiating mini menu which throws an error", function (assert) {
			oSandbox.stub(sap.ui.getCore(), "getStaticAreaRef").throws(new Error("DOM is not ready yet. Static UIArea cannot be created."));
			assert.throws(function() { this.oMiniMenuControl = new MiniMenuControl(); },
				/Popup cannot be opened because static UIArea cannot be determined./,
				"then error with correct message ist thrown");
			assert.ok(true);
		});
	});
});