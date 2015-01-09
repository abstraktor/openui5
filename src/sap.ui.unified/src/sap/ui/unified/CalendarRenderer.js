/*!
 * ${copyright}
 */

sap.ui.define(['jquery.sap.global'],
	function(jQuery) {
	"use strict";


	/**
	 * DatePicker renderer.
	 * @namespace
	 */
	var CalendarRenderer = {
	};

	/**
	 * Renders the HTML for the given control, using the provided {@link sap.ui.core.RenderManager}.
	 *
	 * @param {sap.ui.core.RenderManager} oRm the RenderManager that can be used for writing to the render output buffer
	 * @param {sap.ui.unified.Calendar} oCal an object representation of the control that should be rendered
	 */
	CalendarRenderer.render = function(oRm, oCal){

		oCal._iMode = 0; // it's rendered always as DayPicker

		var sId = oCal.getId();
		var sTooltip = oCal.getTooltip_AsString();

		oRm.write("<div");
		oRm.writeControlData(oCal);
		oRm.addClass("sapUiCal");
		oRm.writeClasses();
		// This makes the calendar focusable and therefore
		// the white empty areas can be clicked without closing the calendar
		// by accident.
		oRm.writeAttribute("tabindex", "-1");

		var rb = sap.ui.getCore().getLibraryResourceBundle("sap.ui.unified");
		oRm.writeAccessibilityState(oCal, {
			role: "dialog",
			label: rb.getText("DATEPICKER_DIALOG")
		});

		if (sTooltip) {
			oRm.writeAttributeEscaped('title', sTooltip);
		}

		oRm.write(">"); // div element

		var oHeader = oCal.getAggregation("header");
		oRm.renderControl(oHeader);

		oRm.write("<div id=\"" + sId + "-content\" class=\"sapUiCalContent\">");
		var aMonths = oCal.getAggregation("month");
		for (var i = 0; i < aMonths.length; i++) {
			var oMonth = aMonths[i];
			oRm.renderControl(oMonth);
		}
		oRm.write("</div>");

		oRm.write("<button id=\"" + sId + "-cancel\" class=\"sapUiCalCancel\" tabindex=\"-1\">");
		oRm.write(rb.getText("CALENDAR_CANCEL"));
		oRm.write("</button>");

		// dummy element to catch tabbing in from next element
		oRm.write("<div id=\"" + sId + "-end\" tabindex=\"0\" style=\"width:0;height:0;position:absolute;right:0;bottom:0;\"></div>");

		oRm.write("</div>");
	};

	return CalendarRenderer;

}, /* bExport= */ true);
