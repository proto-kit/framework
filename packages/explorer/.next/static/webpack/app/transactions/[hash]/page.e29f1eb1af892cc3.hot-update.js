"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
self["webpackHotUpdate_N_E"]("app/transactions/[hash]/page",{

/***/ "(app-pages-browser)/./src/app/transactions/[hash]/page.tsx":
/*!**********************************************!*\
  !*** ./src/app/transactions/[hash]/page.tsx ***!
  \**********************************************/
/***/ (function(module, __webpack_exports__, __webpack_require__) {

eval(__webpack_require__.ts("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": function() { return /* binding */ BlockDetail; }\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"(app-pages-browser)/./node_modules/.pnpm/next@14.2.4_react-dom@18.3.1_react@18.3.1/node_modules/next/dist/compiled/react/jsx-dev-runtime.js\");\n/* harmony import */ var _barrel_optimize_names_CircleCheck_CircleX_lucide_react__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! __barrel_optimize__?names=CircleCheck,CircleX!=!lucide-react */ \"(app-pages-browser)/./node_modules/.pnpm/lucide-react@0.395.0_react@18.3.1/node_modules/lucide-react/dist/esm/icons/circle-check.js\");\n/* harmony import */ var _barrel_optimize_names_CircleCheck_CircleX_lucide_react__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! __barrel_optimize__?names=CircleCheck,CircleX!=!lucide-react */ \"(app-pages-browser)/./node_modules/.pnpm/lucide-react@0.395.0_react@18.3.1/node_modules/lucide-react/dist/esm/icons/circle-x.js\");\n/* harmony import */ var next_navigation__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/navigation */ \"(app-pages-browser)/./node_modules/.pnpm/next@14.2.4_react-dom@18.3.1_react@18.3.1/node_modules/next/dist/api/navigation.js\");\n/* harmony import */ var _components_details_layout__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/components/details/layout */ \"(app-pages-browser)/./src/components/details/layout.tsx\");\n/* harmony import */ var react_hook_form__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! react-hook-form */ \"(app-pages-browser)/./node_modules/.pnpm/react-hook-form@7.52.1_react@18.3.1/node_modules/react-hook-form/dist/index.esm.mjs\");\n/* harmony import */ var react_truncate_inside_es__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! react-truncate-inside/es */ \"(app-pages-browser)/./node_modules/.pnpm/react-truncate-inside@1.0.3_react@18.3.1/node_modules/react-truncate-inside/es/index.js\");\n/* harmony import */ var _hooks_use_query__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @/hooks/use-query */ \"(app-pages-browser)/./src/hooks/use-query.tsx\");\n/* harmony import */ var react_json_view_lite__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! react-json-view-lite */ \"(app-pages-browser)/../../node_modules/.pnpm/react-json-view-lite@1.4.0_react@18.3.1/node_modules/react-json-view-lite/dist/index.modern.js\");\n/* harmony import */ var react_json_view_lite_dist_index_css__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! react-json-view-lite/dist/index.css */ \"(app-pages-browser)/../../node_modules/.pnpm/react-json-view-lite@1.4.0_react@18.3.1/node_modules/react-json-view-lite/dist/index.css\");\n/* __next_internal_client_entry_do_not_use__ default auto */ \nvar _s = $RefreshSig$();\n\n\n\n\n\n\n\n\nconst columns = {\n    hash: \"Hash\",\n    methodId: \"Method ID\",\n    sender: \"Sender\",\n    nonce: \"Nonce\",\n    status: \"Status\",\n    statusMessage: \"Status Message\"\n};\nfunction BlockDetail() {\n    var _data_transactions_items_, _data_transactions_items_1, _data_transactions_items_2, _data_transactions_items_3, _data_transactions_items_4, _data_transactions_items_5, _data_transactions_items_6, _data_transactions_items_7, _data_transactions_items_8;\n    _s();\n    const params = (0,next_navigation__WEBPACK_IMPORTED_MODULE_1__.useParams)();\n    const [data, loading] = (0,_hooks_use_query__WEBPACK_IMPORTED_MODULE_4__[\"default\"])('{\\n      transactions(take: 1, skip: 0, hash: \"'.concat(params.hash, '\"){\\n        totalCount,\\n        items {\\n          tx {\\n            hash,\\n            methodId,\\n            sender,\\n            nonce\\n          },\\n          status,\\n          statusMessage,\\n          stateTransitions {\\n            path,\\n            from,\\n            to\\n          }\\n        }\\n      }\\n    }'));\n    var _data_transactions_items__tx_nonce, _data_transactions_items__statusMessage, _data_transactions_items__tx_methodId, _data_transactions_items__tx_hash, _data_transactions_items__tx_sender;\n    const details = [\n        {\n            label: \"Nonce\",\n            value: (_data_transactions_items__tx_nonce = data === null || data === void 0 ? void 0 : (_data_transactions_items_ = data.transactions.items[0]) === null || _data_transactions_items_ === void 0 ? void 0 : _data_transactions_items_.tx.nonce) !== null && _data_transactions_items__tx_nonce !== void 0 ? _data_transactions_items__tx_nonce : \"—\"\n        },\n        {\n            label: \"Status\",\n            value: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                className: \"mt-1\",\n                children: (data === null || data === void 0 ? void 0 : (_data_transactions_items_1 = data.transactions.items[0]) === null || _data_transactions_items_1 === void 0 ? void 0 : _data_transactions_items_1.status) ? /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_barrel_optimize_names_CircleCheck_CircleX_lucide_react__WEBPACK_IMPORTED_MODULE_7__[\"default\"], {\n                    className: \"w-4 h-4 text-green-500\"\n                }, void 0, false, {\n                    fileName: \"/Users/maht0rz/Projects/stove-labs/mina/protokit/framework/packages/explorer/src/app/transactions/[hash]/page.tsx\",\n                    lineNumber: 100,\n                    columnNumber: 13\n                }, this) : /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_barrel_optimize_names_CircleCheck_CircleX_lucide_react__WEBPACK_IMPORTED_MODULE_8__[\"default\"], {\n                    className: \"w-4 h-4 text-red-500\"\n                }, void 0, false, {\n                    fileName: \"/Users/maht0rz/Projects/stove-labs/mina/protokit/framework/packages/explorer/src/app/transactions/[hash]/page.tsx\",\n                    lineNumber: 102,\n                    columnNumber: 13\n                }, this)\n            }, void 0, false, {\n                fileName: \"/Users/maht0rz/Projects/stove-labs/mina/protokit/framework/packages/explorer/src/app/transactions/[hash]/page.tsx\",\n                lineNumber: 98,\n                columnNumber: 9\n            }, this)\n        },\n        {\n            label: \"Status message\",\n            value: (_data_transactions_items__statusMessage = data === null || data === void 0 ? void 0 : (_data_transactions_items_2 = data.transactions.items[0]) === null || _data_transactions_items_2 === void 0 ? void 0 : _data_transactions_items_2.statusMessage) !== null && _data_transactions_items__statusMessage !== void 0 ? _data_transactions_items__statusMessage : \"—\"\n        },\n        {\n            label: \"Method ID\",\n            value: (_data_transactions_items__tx_methodId = data === null || data === void 0 ? void 0 : (_data_transactions_items_3 = data.transactions.items[0]) === null || _data_transactions_items_3 === void 0 ? void 0 : _data_transactions_items_3.tx.methodId) !== null && _data_transactions_items__tx_methodId !== void 0 ? _data_transactions_items__tx_methodId : \"—\"\n        },\n        {\n            label: \"Hash\",\n            value: (_data_transactions_items__tx_hash = data === null || data === void 0 ? void 0 : (_data_transactions_items_4 = data.transactions.items[0]) === null || _data_transactions_items_4 === void 0 ? void 0 : _data_transactions_items_4.tx.hash) !== null && _data_transactions_items__tx_hash !== void 0 ? _data_transactions_items__tx_hash : \"—\"\n        },\n        {\n            label: \"Sender\",\n            value: (_data_transactions_items__tx_sender = data === null || data === void 0 ? void 0 : (_data_transactions_items_5 = data.transactions.items[0]) === null || _data_transactions_items_5 === void 0 ? void 0 : _data_transactions_items_5.tx.sender) !== null && _data_transactions_items__tx_sender !== void 0 ? _data_transactions_items__tx_sender : \"—\"\n        }\n    ];\n    const form = (0,react_hook_form__WEBPACK_IMPORTED_MODULE_9__.useForm)();\n    var _data_transactions_items__tx_hash1;\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_components_details_layout__WEBPACK_IMPORTED_MODULE_2__.DetailsLayout, {\n        title: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n            className: \"flex gap-4\",\n            children: [\n                \"Transaction\",\n                \" \",\n                !loading && /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(react_truncate_inside_es__WEBPACK_IMPORTED_MODULE_3__[\"default\"], {\n                    text: (_data_transactions_items__tx_hash1 = data === null || data === void 0 ? void 0 : (_data_transactions_items_6 = data.transactions.items[0]) === null || _data_transactions_items_6 === void 0 ? void 0 : _data_transactions_items_6.tx.hash) !== null && _data_transactions_items__tx_hash1 !== void 0 ? _data_transactions_items__tx_hash1 : \"\",\n                    width: 500\n                }, void 0, false, {\n                    fileName: \"/Users/maht0rz/Projects/stove-labs/mina/protokit/framework/packages/explorer/src/app/transactions/[hash]/page.tsx\",\n                    lineNumber: 133,\n                    columnNumber: 13\n                }, void 0)\n            ]\n        }, void 0, true, {\n            fileName: \"/Users/maht0rz/Projects/stove-labs/mina/protokit/framework/packages/explorer/src/app/transactions/[hash]/page.tsx\",\n            lineNumber: 130,\n            columnNumber: 9\n        }, void 0),\n        details: details,\n        loading: loading,\n        children: [\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.Fragment, {}, void 0, false),\n            (data === null || data === void 0 ? void 0 : (_data_transactions_items_7 = data.transactions.items[0]) === null || _data_transactions_items_7 === void 0 ? void 0 : _data_transactions_items_7.stateTransitions) && /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(react_json_view_lite__WEBPACK_IMPORTED_MODULE_5__.JsonView, {\n                data: data === null || data === void 0 ? void 0 : (_data_transactions_items_8 = data.transactions.items[0]) === null || _data_transactions_items_8 === void 0 ? void 0 : _data_transactions_items_8.stateTransitions,\n                shouldExpandNode: react_json_view_lite__WEBPACK_IMPORTED_MODULE_5__.allExpanded,\n                style: react_json_view_lite__WEBPACK_IMPORTED_MODULE_5__.defaultStyles\n            }, void 0, false, {\n                fileName: \"/Users/maht0rz/Projects/stove-labs/mina/protokit/framework/packages/explorer/src/app/transactions/[hash]/page.tsx\",\n                lineNumber: 145,\n                columnNumber: 9\n            }, this)\n        ]\n    }, void 0, true, {\n        fileName: \"/Users/maht0rz/Projects/stove-labs/mina/protokit/framework/packages/explorer/src/app/transactions/[hash]/page.tsx\",\n        lineNumber: 128,\n        columnNumber: 5\n    }, this);\n}\n_s(BlockDetail, \"HnRQT7nz4tmJC10wJMSrGv6gd0U=\", false, function() {\n    return [\n        next_navigation__WEBPACK_IMPORTED_MODULE_1__.useParams,\n        _hooks_use_query__WEBPACK_IMPORTED_MODULE_4__[\"default\"],\n        react_hook_form__WEBPACK_IMPORTED_MODULE_9__.useForm\n    ];\n});\n_c = BlockDetail;\nvar _c;\n$RefreshReg$(_c, \"BlockDetail\");\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                module.hot.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL3NyYy9hcHAvdHJhbnNhY3Rpb25zL1toYXNoXS9wYWdlLnRzeCIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O0FBRW9EO0FBVW9CO0FBQ1o7QUFLbEI7QUFJTTtBQUNQO0FBTVg7QUFDZTtBQTBCN0MsTUFBTVUsVUFBMkM7SUFDL0NDLE1BQU07SUFDTkMsVUFBVTtJQUNWQyxRQUFRO0lBQ1JDLE9BQU87SUFDUEMsUUFBUTtJQUNSQyxlQUFlO0FBQ2pCO0FBRWUsU0FBU0M7UUEyQlhDLDJCQU1GQSw0QkFVRUEsNEJBSUFBLDRCQUlBQSw0QkFJQUEsNEJBYU9BLDRCQVViQSw0QkFFU0E7O0lBL0VkLE1BQU1DLFNBQVNqQiwwREFBU0E7SUFFeEIsTUFBTSxDQUFDZ0IsTUFBTUUsUUFBUSxHQUFHZCw0REFBUUEsQ0FBOEIsa0RBQ04sT0FBWmEsT0FBT1IsSUFBSSxFQUFDO1FBdUI3Q08sb0NBZ0JBQSx5Q0FJQUEsdUNBSUFBLG1DQUlBQTtJQS9CWCxNQUFNRyxVQUFVO1FBQ2Q7WUFDRUMsT0FBTztZQUNQQyxPQUFPTCxDQUFBQSxxQ0FBQUEsaUJBQUFBLDRCQUFBQSw0QkFBQUEsS0FBTU0sWUFBWSxDQUFDQyxLQUFLLENBQUMsRUFBRSxjQUEzQlAsZ0RBQUFBLDBCQUE2QlEsRUFBRSxDQUFDWixLQUFLLGNBQXJDSSxnREFBQUEscUNBQXlDO1FBQ2xEO1FBQ0E7WUFDRUksT0FBTztZQUNQQyxxQkFDRSw4REFBQ0k7Z0JBQUlDLFdBQVU7MEJBQ1pWLENBQUFBLGlCQUFBQSw0QkFBQUEsNkJBQUFBLEtBQU1NLFlBQVksQ0FBQ0MsS0FBSyxDQUFDLEVBQUUsY0FBM0JQLGlEQUFBQSwyQkFBNkJILE1BQU0sa0JBQ2xDLDhEQUFDZiwrRkFBV0E7b0JBQUM0QixXQUFVOzs7Ozt5Q0FFdkIsOERBQUMzQiwrRkFBT0E7b0JBQUMyQixXQUFVOzs7Ozs7Ozs7OztRQUkzQjtRQUNBO1lBQ0VOLE9BQU87WUFDUEMsT0FBT0wsQ0FBQUEsMENBQUFBLGlCQUFBQSw0QkFBQUEsNkJBQUFBLEtBQU1NLFlBQVksQ0FBQ0MsS0FBSyxDQUFDLEVBQUUsY0FBM0JQLGlEQUFBQSwyQkFBNkJGLGFBQWEsY0FBMUNFLHFEQUFBQSwwQ0FBOEM7UUFDdkQ7UUFDQTtZQUNFSSxPQUFPO1lBQ1BDLE9BQU9MLENBQUFBLHdDQUFBQSxpQkFBQUEsNEJBQUFBLDZCQUFBQSxLQUFNTSxZQUFZLENBQUNDLEtBQUssQ0FBQyxFQUFFLGNBQTNCUCxpREFBQUEsMkJBQTZCUSxFQUFFLENBQUNkLFFBQVEsY0FBeENNLG1EQUFBQSx3Q0FBNEM7UUFDckQ7UUFDQTtZQUNFSSxPQUFPO1lBQ1BDLE9BQU9MLENBQUFBLG9DQUFBQSxpQkFBQUEsNEJBQUFBLDZCQUFBQSxLQUFNTSxZQUFZLENBQUNDLEtBQUssQ0FBQyxFQUFFLGNBQTNCUCxpREFBQUEsMkJBQTZCUSxFQUFFLENBQUNmLElBQUksY0FBcENPLCtDQUFBQSxvQ0FBd0M7UUFDakQ7UUFDQTtZQUNFSSxPQUFPO1lBQ1BDLE9BQU9MLENBQUFBLHNDQUFBQSxpQkFBQUEsNEJBQUFBLDZCQUFBQSxLQUFNTSxZQUFZLENBQUNDLEtBQUssQ0FBQyxFQUFFLGNBQTNCUCxpREFBQUEsMkJBQTZCUSxFQUFFLENBQUNiLE1BQU0sY0FBdENLLGlEQUFBQSxzQ0FBMEM7UUFDbkQ7S0FDRDtJQUVELE1BQU1XLE9BQU96Qix3REFBT0E7UUFTRmM7SUFQbEIscUJBQ0UsOERBQUNmLHFFQUFhQTtRQUNaMkIscUJBQ0UsOERBQUNIO1lBQUlDLFdBQVU7O2dCQUFhO2dCQUNkO2dCQUNYLENBQUNSLHlCQUNBLDhEQUFDZixnRUFBUUE7b0JBQ1AwQixNQUFNYixDQUFBQSxxQ0FBQUEsaUJBQUFBLDRCQUFBQSw2QkFBQUEsS0FBTU0sWUFBWSxDQUFDQyxLQUFLLENBQUMsRUFBRSxjQUEzQlAsaURBQUFBLDJCQUE2QlEsRUFBRSxDQUFDZixJQUFJLGNBQXBDTyxnREFBQUEscUNBQXdDO29CQUM5Q2MsT0FBTzs7Ozs7Ozs7Ozs7O1FBS2ZYLFNBQVNBO1FBQ1RELFNBQVNBOzswQkFFVDtZQUNDRixDQUFBQSxpQkFBQUEsNEJBQUFBLDZCQUFBQSxLQUFNTSxZQUFZLENBQUNDLEtBQUssQ0FBQyxFQUFFLGNBQTNCUCxpREFBQUEsMkJBQTZCZSxnQkFBZ0IsbUJBQzVDLDhEQUFDMUIsMERBQVFBO2dCQUNQVyxJQUFJLEVBQUVBLGlCQUFBQSw0QkFBQUEsNkJBQUFBLEtBQU1NLFlBQVksQ0FBQ0MsS0FBSyxDQUFDLEVBQUUsY0FBM0JQLGlEQUFBQSwyQkFBNkJlLGdCQUFnQjtnQkFDbkRDLGtCQUFrQjFCLDZEQUFXQTtnQkFDN0IyQixPQUFPMUIsK0RBQWFBOzs7Ozs7Ozs7Ozs7QUFLOUI7R0F2RndCUTs7UUFDUGYsc0RBQVNBO1FBRUFJLHdEQUFRQTtRQXdEbkJGLG9EQUFPQTs7O0tBM0RFYSIsInNvdXJjZXMiOlsid2VicGFjazovL19OX0UvLi9zcmMvYXBwL3RyYW5zYWN0aW9ucy9baGFzaF0vcGFnZS50c3g/YzNjMCJdLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBjbGllbnRcIjtcbmltcG9ydCB7IENhcmQgfSBmcm9tIFwiQC9jb21wb25lbnRzL3VpL2NhcmRcIjtcbmltcG9ydCB7IENpcmNsZUNoZWNrLCBDaXJjbGVYIH0gZnJvbSBcImx1Y2lkZS1yZWFjdFwiO1xuaW1wb3J0IHtcbiAgVGFibGUsXG4gIFRhYmxlQm9keSxcbiAgVGFibGVDZWxsLFxuICBUYWJsZUhlYWQsXG4gIFRhYmxlSGVhZGVyLFxuICBUYWJsZVJvdyxcbn0gZnJvbSBcIkAvY29tcG9uZW50cy91aS90YWJsZVwiO1xuXG5pbXBvcnQgeyB1c2VQYXJhbXMsIHVzZVJvdXRlciwgdXNlU2VhcmNoUGFyYW1zIH0gZnJvbSBcIm5leHQvbmF2aWdhdGlvblwiO1xuaW1wb3J0IHsgRGV0YWlsc0xheW91dCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZGV0YWlscy9sYXlvdXRcIjtcbmltcG9ydCBUcmFuc2FjdGlvbnNUYWJsZVJvdywge1xuICBUYWJsZUl0ZW0sXG59IGZyb20gXCJAL2NvbXBvbmVudHMvdHJhbnNhY3Rpb25zL3RyYW5zYWN0aW9ucy10YWJsZS1yb3dcIjtcbmltcG9ydCB7IEZvcm0gfSBmcm9tIFwiQC9jb21wb25lbnRzL3VpL2Zvcm1cIjtcbmltcG9ydCB7IHVzZUZvcm0gfSBmcm9tIFwicmVhY3QtaG9vay1mb3JtXCI7XG5pbXBvcnQgTGlzdCwgeyBMaXN0UHJvcHMgfSBmcm9tIFwiQC9jb21wb25lbnRzL2xpc3RcIjtcbmltcG9ydCB7IHVzZUNhbGxiYWNrLCB1c2VFZmZlY3QsIHVzZVN0YXRlIH0gZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgY29uZmlnIGZyb20gXCJAL2NvbmZpZ1wiO1xuaW1wb3J0IFRydW5jYXRlIGZyb20gXCJyZWFjdC10cnVuY2F0ZS1pbnNpZGUvZXNcIjtcbmltcG9ydCB1c2VRdWVyeSBmcm9tIFwiQC9ob29rcy91c2UtcXVlcnlcIjtcbmltcG9ydCB7XG4gIEpzb25WaWV3LFxuICBhbGxFeHBhbmRlZCxcbiAgZGFya1N0eWxlcyxcbiAgZGVmYXVsdFN0eWxlcyxcbn0gZnJvbSBcInJlYWN0LWpzb24tdmlldy1saXRlXCI7XG5pbXBvcnQgXCJyZWFjdC1qc29uLXZpZXctbGl0ZS9kaXN0L2luZGV4LmNzc1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIEdldFRyYW5zYWN0aW9uUXVlcnlSZXNwb25zZSB7XG4gIHRyYW5zYWN0aW9uczoge1xuICAgIHRvdGFsQ291bnQ6IHN0cmluZztcbiAgICBpdGVtczogKFxuICAgICAgfCB7XG4gICAgICAgICAgdHg6IHtcbiAgICAgICAgICAgIGhhc2g6IHN0cmluZztcbiAgICAgICAgICAgIHNlbmRlcjogc3RyaW5nO1xuICAgICAgICAgICAgbWV0aG9kSWQ6IHN0cmluZztcbiAgICAgICAgICAgIG5vbmNlOiBzdHJpbmc7XG4gICAgICAgICAgfTtcbiAgICAgICAgICBzdGF0dXM6IGJvb2xlYW47XG4gICAgICAgICAgc3RhdHVzTWVzc2FnZT86IHN0cmluZztcbiAgICAgICAgICBzdGF0ZVRyYW5zaXRpb25zOiB7XG4gICAgICAgICAgICBwYXRoOiBzdHJpbmc7XG4gICAgICAgICAgICBmcm9tOiBzdHJpbmc7XG4gICAgICAgICAgICB0bzogc3RyaW5nO1xuICAgICAgICAgIH1bXTtcbiAgICAgICAgfVxuICAgICAgfCB1bmRlZmluZWRcbiAgICApW107XG4gIH07XG59XG5cbmNvbnN0IGNvbHVtbnM6IFJlY29yZDxrZXlvZiBUYWJsZUl0ZW0sIHN0cmluZz4gPSB7XG4gIGhhc2g6IFwiSGFzaFwiLFxuICBtZXRob2RJZDogXCJNZXRob2QgSURcIixcbiAgc2VuZGVyOiBcIlNlbmRlclwiLFxuICBub25jZTogXCJOb25jZVwiLFxuICBzdGF0dXM6IFwiU3RhdHVzXCIsXG4gIHN0YXR1c01lc3NhZ2U6IFwiU3RhdHVzIE1lc3NhZ2VcIixcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEJsb2NrRGV0YWlsKCkge1xuICBjb25zdCBwYXJhbXMgPSB1c2VQYXJhbXM8eyBoYXNoOiBzdHJpbmcgfT4oKTtcblxuICBjb25zdCBbZGF0YSwgbG9hZGluZ10gPSB1c2VRdWVyeTxHZXRUcmFuc2FjdGlvblF1ZXJ5UmVzcG9uc2U+KGB7XG4gICAgICB0cmFuc2FjdGlvbnModGFrZTogMSwgc2tpcDogMCwgaGFzaDogXCIke3BhcmFtcy5oYXNofVwiKXtcbiAgICAgICAgdG90YWxDb3VudCxcbiAgICAgICAgaXRlbXMge1xuICAgICAgICAgIHR4IHtcbiAgICAgICAgICAgIGhhc2gsXG4gICAgICAgICAgICBtZXRob2RJZCxcbiAgICAgICAgICAgIHNlbmRlcixcbiAgICAgICAgICAgIG5vbmNlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzdGF0dXMsXG4gICAgICAgICAgc3RhdHVzTWVzc2FnZSxcbiAgICAgICAgICBzdGF0ZVRyYW5zaXRpb25zIHtcbiAgICAgICAgICAgIHBhdGgsXG4gICAgICAgICAgICBmcm9tLFxuICAgICAgICAgICAgdG9cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9YCk7XG5cbiAgY29uc3QgZGV0YWlscyA9IFtcbiAgICB7XG4gICAgICBsYWJlbDogXCJOb25jZVwiLFxuICAgICAgdmFsdWU6IGRhdGE/LnRyYW5zYWN0aW9ucy5pdGVtc1swXT8udHgubm9uY2UgPz8gXCLigJRcIixcbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIlN0YXR1c1wiLFxuICAgICAgdmFsdWU6IChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC0xXCI+XG4gICAgICAgICAge2RhdGE/LnRyYW5zYWN0aW9ucy5pdGVtc1swXT8uc3RhdHVzID8gKFxuICAgICAgICAgICAgPENpcmNsZUNoZWNrIGNsYXNzTmFtZT1cInctNCBoLTQgdGV4dC1ncmVlbi01MDBcIiAvPlxuICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICA8Q2lyY2xlWCBjbGFzc05hbWU9XCJ3LTQgaC00IHRleHQtcmVkLTUwMFwiIC8+XG4gICAgICAgICAgKX1cbiAgICAgICAgPC9kaXY+XG4gICAgICApLFxuICAgIH0sXG4gICAge1xuICAgICAgbGFiZWw6IFwiU3RhdHVzIG1lc3NhZ2VcIixcbiAgICAgIHZhbHVlOiBkYXRhPy50cmFuc2FjdGlvbnMuaXRlbXNbMF0/LnN0YXR1c01lc3NhZ2UgPz8gXCLigJRcIixcbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIk1ldGhvZCBJRFwiLFxuICAgICAgdmFsdWU6IGRhdGE/LnRyYW5zYWN0aW9ucy5pdGVtc1swXT8udHgubWV0aG9kSWQgPz8gXCLigJRcIixcbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIkhhc2hcIixcbiAgICAgIHZhbHVlOiBkYXRhPy50cmFuc2FjdGlvbnMuaXRlbXNbMF0/LnR4Lmhhc2ggPz8gXCLigJRcIixcbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIlNlbmRlclwiLFxuICAgICAgdmFsdWU6IGRhdGE/LnRyYW5zYWN0aW9ucy5pdGVtc1swXT8udHguc2VuZGVyID8/IFwi4oCUXCIsXG4gICAgfSxcbiAgXTtcblxuICBjb25zdCBmb3JtID0gdXNlRm9ybSgpO1xuXG4gIHJldHVybiAoXG4gICAgPERldGFpbHNMYXlvdXRcbiAgICAgIHRpdGxlPXtcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGdhcC00XCI+XG4gICAgICAgICAgVHJhbnNhY3Rpb257XCIgXCJ9XG4gICAgICAgICAgeyFsb2FkaW5nICYmIChcbiAgICAgICAgICAgIDxUcnVuY2F0ZVxuICAgICAgICAgICAgICB0ZXh0PXtkYXRhPy50cmFuc2FjdGlvbnMuaXRlbXNbMF0/LnR4Lmhhc2ggPz8gXCJcIn1cbiAgICAgICAgICAgICAgd2lkdGg9ezUwMH1cbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgKX1cbiAgICAgICAgPC9kaXY+XG4gICAgICB9XG4gICAgICBkZXRhaWxzPXtkZXRhaWxzfVxuICAgICAgbG9hZGluZz17bG9hZGluZ31cbiAgICA+XG4gICAgICA8PjwvPlxuICAgICAge2RhdGE/LnRyYW5zYWN0aW9ucy5pdGVtc1swXT8uc3RhdGVUcmFuc2l0aW9ucyAmJiAoXG4gICAgICAgIDxKc29uVmlld1xuICAgICAgICAgIGRhdGE9e2RhdGE/LnRyYW5zYWN0aW9ucy5pdGVtc1swXT8uc3RhdGVUcmFuc2l0aW9uc31cbiAgICAgICAgICBzaG91bGRFeHBhbmROb2RlPXthbGxFeHBhbmRlZH1cbiAgICAgICAgICBzdHlsZT17ZGVmYXVsdFN0eWxlc31cbiAgICAgICAgLz5cbiAgICAgICl9XG4gICAgPC9EZXRhaWxzTGF5b3V0PlxuICApO1xufVxuIl0sIm5hbWVzIjpbIkNpcmNsZUNoZWNrIiwiQ2lyY2xlWCIsInVzZVBhcmFtcyIsIkRldGFpbHNMYXlvdXQiLCJ1c2VGb3JtIiwiVHJ1bmNhdGUiLCJ1c2VRdWVyeSIsIkpzb25WaWV3IiwiYWxsRXhwYW5kZWQiLCJkZWZhdWx0U3R5bGVzIiwiY29sdW1ucyIsImhhc2giLCJtZXRob2RJZCIsInNlbmRlciIsIm5vbmNlIiwic3RhdHVzIiwic3RhdHVzTWVzc2FnZSIsIkJsb2NrRGV0YWlsIiwiZGF0YSIsInBhcmFtcyIsImxvYWRpbmciLCJkZXRhaWxzIiwibGFiZWwiLCJ2YWx1ZSIsInRyYW5zYWN0aW9ucyIsIml0ZW1zIiwidHgiLCJkaXYiLCJjbGFzc05hbWUiLCJmb3JtIiwidGl0bGUiLCJ0ZXh0Iiwid2lkdGgiLCJzdGF0ZVRyYW5zaXRpb25zIiwic2hvdWxkRXhwYW5kTm9kZSIsInN0eWxlIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(app-pages-browser)/./src/app/transactions/[hash]/page.tsx\n"));

/***/ })

});