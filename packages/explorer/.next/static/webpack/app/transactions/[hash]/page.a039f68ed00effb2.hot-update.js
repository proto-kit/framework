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

eval(__webpack_require__.ts("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": function() { return /* binding */ BlockDetail; }\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"(app-pages-browser)/./node_modules/.pnpm/next@14.2.4_react-dom@18.3.1_react@18.3.1/node_modules/next/dist/compiled/react/jsx-dev-runtime.js\");\n/* harmony import */ var _barrel_optimize_names_CircleCheck_CircleX_lucide_react__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! __barrel_optimize__?names=CircleCheck,CircleX!=!lucide-react */ \"(app-pages-browser)/./node_modules/.pnpm/lucide-react@0.395.0_react@18.3.1/node_modules/lucide-react/dist/esm/icons/circle-check.js\");\n/* harmony import */ var _barrel_optimize_names_CircleCheck_CircleX_lucide_react__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! __barrel_optimize__?names=CircleCheck,CircleX!=!lucide-react */ \"(app-pages-browser)/./node_modules/.pnpm/lucide-react@0.395.0_react@18.3.1/node_modules/lucide-react/dist/esm/icons/circle-x.js\");\n/* harmony import */ var next_navigation__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/navigation */ \"(app-pages-browser)/./node_modules/.pnpm/next@14.2.4_react-dom@18.3.1_react@18.3.1/node_modules/next/dist/api/navigation.js\");\n/* harmony import */ var _components_details_layout__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/components/details/layout */ \"(app-pages-browser)/./src/components/details/layout.tsx\");\n/* harmony import */ var react_hook_form__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! react-hook-form */ \"(app-pages-browser)/./node_modules/.pnpm/react-hook-form@7.52.1_react@18.3.1/node_modules/react-hook-form/dist/index.esm.mjs\");\n/* harmony import */ var react_truncate_inside_es__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! react-truncate-inside/es */ \"(app-pages-browser)/./node_modules/.pnpm/react-truncate-inside@1.0.3_react@18.3.1/node_modules/react-truncate-inside/es/index.js\");\n/* harmony import */ var _hooks_use_query__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @/hooks/use-query */ \"(app-pages-browser)/./src/hooks/use-query.tsx\");\n/* harmony import */ var react_json_view_lite__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! react-json-view-lite */ \"(app-pages-browser)/../../node_modules/.pnpm/react-json-view-lite@1.4.0_react@18.3.1/node_modules/react-json-view-lite/dist/index.modern.js\");\n/* harmony import */ var react_json_view_lite_dist_index_css__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! react-json-view-lite/dist/index.css */ \"(app-pages-browser)/../../node_modules/.pnpm/react-json-view-lite@1.4.0_react@18.3.1/node_modules/react-json-view-lite/dist/index.css\");\n/* __next_internal_client_entry_do_not_use__ default auto */ \nvar _s = $RefreshSig$();\n\n\n\n\n\n\n\n\nconst columns = {\n    hash: \"Hash\",\n    methodId: \"Method ID\",\n    sender: \"Sender\",\n    nonce: \"Nonce\",\n    status: \"Status\",\n    statusMessage: \"Status Message\"\n};\nfunction BlockDetail() {\n    var _data_transactions_items_, _data_transactions_items_1, _data_transactions_items_2, _data_transactions_items_3, _data_transactions_items_4, _data_transactions_items_5, _data_transactions_items_6, _data_transactions_items_7, _data_transactions_items_8;\n    _s();\n    const params = (0,next_navigation__WEBPACK_IMPORTED_MODULE_1__.useParams)();\n    const [data, loading] = (0,_hooks_use_query__WEBPACK_IMPORTED_MODULE_4__[\"default\"])('{\\n      transactions(take: 1, skip: 0, hash: \"'.concat(params.hash, '\"){\\n        totalCount,\\n        items {\\n          tx {\\n            hash,\\n            methodId,\\n            sender,\\n            nonce\\n          },\\n          status,\\n          statusMessage,\\n          stateTransitions {\\n            path,\\n            from {\\n              isSome, \\n              value\\n            }\\n            to {\\n              isSome,\\n              value\\n            }\\n          }\\n        }\\n      }\\n    }'));\n    var _data_transactions_items__tx_nonce, _data_transactions_items__statusMessage, _data_transactions_items__tx_methodId, _data_transactions_items__tx_hash, _data_transactions_items__tx_sender;\n    const details = [\n        {\n            label: \"Nonce\",\n            value: (_data_transactions_items__tx_nonce = data === null || data === void 0 ? void 0 : (_data_transactions_items_ = data.transactions.items[0]) === null || _data_transactions_items_ === void 0 ? void 0 : _data_transactions_items_.tx.nonce) !== null && _data_transactions_items__tx_nonce !== void 0 ? _data_transactions_items__tx_nonce : \"—\"\n        },\n        {\n            label: \"Status\",\n            value: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                className: \"mt-1\",\n                children: (data === null || data === void 0 ? void 0 : (_data_transactions_items_1 = data.transactions.items[0]) === null || _data_transactions_items_1 === void 0 ? void 0 : _data_transactions_items_1.status) ? /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_barrel_optimize_names_CircleCheck_CircleX_lucide_react__WEBPACK_IMPORTED_MODULE_7__[\"default\"], {\n                    className: \"w-4 h-4 text-green-500\"\n                }, void 0, false, {\n                    fileName: \"/Users/maht0rz/Projects/stove-labs/mina/protokit/framework/packages/explorer/src/app/transactions/[hash]/page.tsx\",\n                    lineNumber: 112,\n                    columnNumber: 13\n                }, this) : /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_barrel_optimize_names_CircleCheck_CircleX_lucide_react__WEBPACK_IMPORTED_MODULE_8__[\"default\"], {\n                    className: \"w-4 h-4 text-red-500\"\n                }, void 0, false, {\n                    fileName: \"/Users/maht0rz/Projects/stove-labs/mina/protokit/framework/packages/explorer/src/app/transactions/[hash]/page.tsx\",\n                    lineNumber: 114,\n                    columnNumber: 13\n                }, this)\n            }, void 0, false, {\n                fileName: \"/Users/maht0rz/Projects/stove-labs/mina/protokit/framework/packages/explorer/src/app/transactions/[hash]/page.tsx\",\n                lineNumber: 110,\n                columnNumber: 9\n            }, this)\n        },\n        {\n            label: \"Status message\",\n            value: (_data_transactions_items__statusMessage = data === null || data === void 0 ? void 0 : (_data_transactions_items_2 = data.transactions.items[0]) === null || _data_transactions_items_2 === void 0 ? void 0 : _data_transactions_items_2.statusMessage) !== null && _data_transactions_items__statusMessage !== void 0 ? _data_transactions_items__statusMessage : \"—\"\n        },\n        {\n            label: \"Method ID\",\n            value: (_data_transactions_items__tx_methodId = data === null || data === void 0 ? void 0 : (_data_transactions_items_3 = data.transactions.items[0]) === null || _data_transactions_items_3 === void 0 ? void 0 : _data_transactions_items_3.tx.methodId) !== null && _data_transactions_items__tx_methodId !== void 0 ? _data_transactions_items__tx_methodId : \"—\"\n        },\n        {\n            label: \"Hash\",\n            value: (_data_transactions_items__tx_hash = data === null || data === void 0 ? void 0 : (_data_transactions_items_4 = data.transactions.items[0]) === null || _data_transactions_items_4 === void 0 ? void 0 : _data_transactions_items_4.tx.hash) !== null && _data_transactions_items__tx_hash !== void 0 ? _data_transactions_items__tx_hash : \"—\"\n        },\n        {\n            label: \"Sender\",\n            value: (_data_transactions_items__tx_sender = data === null || data === void 0 ? void 0 : (_data_transactions_items_5 = data.transactions.items[0]) === null || _data_transactions_items_5 === void 0 ? void 0 : _data_transactions_items_5.tx.sender) !== null && _data_transactions_items__tx_sender !== void 0 ? _data_transactions_items__tx_sender : \"—\"\n        }\n    ];\n    const form = (0,react_hook_form__WEBPACK_IMPORTED_MODULE_9__.useForm)();\n    var _data_transactions_items__tx_hash1;\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_components_details_layout__WEBPACK_IMPORTED_MODULE_2__.DetailsLayout, {\n        title: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n            className: \"flex gap-4\",\n            children: [\n                \"Transaction\",\n                \" \",\n                !loading && /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(react_truncate_inside_es__WEBPACK_IMPORTED_MODULE_3__[\"default\"], {\n                    text: (_data_transactions_items__tx_hash1 = data === null || data === void 0 ? void 0 : (_data_transactions_items_6 = data.transactions.items[0]) === null || _data_transactions_items_6 === void 0 ? void 0 : _data_transactions_items_6.tx.hash) !== null && _data_transactions_items__tx_hash1 !== void 0 ? _data_transactions_items__tx_hash1 : \"\",\n                    width: 500\n                }, void 0, false, {\n                    fileName: \"/Users/maht0rz/Projects/stove-labs/mina/protokit/framework/packages/explorer/src/app/transactions/[hash]/page.tsx\",\n                    lineNumber: 145,\n                    columnNumber: 13\n                }, void 0)\n            ]\n        }, void 0, true, {\n            fileName: \"/Users/maht0rz/Projects/stove-labs/mina/protokit/framework/packages/explorer/src/app/transactions/[hash]/page.tsx\",\n            lineNumber: 142,\n            columnNumber: 9\n        }, void 0),\n        details: details,\n        loading: loading,\n        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n            className: \"flex w-full flex-grow\",\n            children: [\n                /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"h1\", {\n                    className: cn(\"scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl\"),\n                    children: \"State transitions\"\n                }, void 0, false, {\n                    fileName: \"/Users/maht0rz/Projects/stove-labs/mina/protokit/framework/packages/explorer/src/app/transactions/[hash]/page.tsx\",\n                    lineNumber: 156,\n                    columnNumber: 9\n                }, this),\n                (data === null || data === void 0 ? void 0 : (_data_transactions_items_7 = data.transactions.items[0]) === null || _data_transactions_items_7 === void 0 ? void 0 : _data_transactions_items_7.stateTransitions) && /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(react_json_view_lite__WEBPACK_IMPORTED_MODULE_5__.JsonView, {\n                    data: data === null || data === void 0 ? void 0 : (_data_transactions_items_8 = data.transactions.items[0]) === null || _data_transactions_items_8 === void 0 ? void 0 : _data_transactions_items_8.stateTransitions,\n                    shouldExpandNode: react_json_view_lite__WEBPACK_IMPORTED_MODULE_5__.allExpanded,\n                    style: {\n                        ...react_json_view_lite__WEBPACK_IMPORTED_MODULE_5__.defaultStyles,\n                        width: \"100%\"\n                    }\n                }, void 0, false, {\n                    fileName: \"/Users/maht0rz/Projects/stove-labs/mina/protokit/framework/packages/explorer/src/app/transactions/[hash]/page.tsx\",\n                    lineNumber: 164,\n                    columnNumber: 11\n                }, this)\n            ]\n        }, void 0, true, {\n            fileName: \"/Users/maht0rz/Projects/stove-labs/mina/protokit/framework/packages/explorer/src/app/transactions/[hash]/page.tsx\",\n            lineNumber: 155,\n            columnNumber: 7\n        }, this)\n    }, void 0, false, {\n        fileName: \"/Users/maht0rz/Projects/stove-labs/mina/protokit/framework/packages/explorer/src/app/transactions/[hash]/page.tsx\",\n        lineNumber: 140,\n        columnNumber: 5\n    }, this);\n}\n_s(BlockDetail, \"HnRQT7nz4tmJC10wJMSrGv6gd0U=\", false, function() {\n    return [\n        next_navigation__WEBPACK_IMPORTED_MODULE_1__.useParams,\n        _hooks_use_query__WEBPACK_IMPORTED_MODULE_4__[\"default\"],\n        react_hook_form__WEBPACK_IMPORTED_MODULE_9__.useForm\n    ];\n});\n_c = BlockDetail;\nvar _c;\n$RefreshReg$(_c, \"BlockDetail\");\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                module.hot.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL3NyYy9hcHAvdHJhbnNhY3Rpb25zL1toYXNoXS9wYWdlLnRzeCIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O0FBRW9EO0FBVW9CO0FBQ1o7QUFLbEI7QUFJTTtBQUNQO0FBTVg7QUFDZTtBQWdDN0MsTUFBTVUsVUFBMkM7SUFDL0NDLE1BQU07SUFDTkMsVUFBVTtJQUNWQyxRQUFRO0lBQ1JDLE9BQU87SUFDUEMsUUFBUTtJQUNSQyxlQUFlO0FBQ2pCO0FBRWUsU0FBU0M7UUFpQ1hDLDJCQU1GQSw0QkFVRUEsNEJBSUFBLDRCQUlBQSw0QkFJQUEsNEJBYU9BLDRCQWlCWEEsNEJBRVNBOztJQTVGaEIsTUFBTUMsU0FBU2pCLDBEQUFTQTtJQUV4QixNQUFNLENBQUNnQixNQUFNRSxRQUFRLEdBQUdkLDREQUFRQSxDQUE4QixrREFDTixPQUFaYSxPQUFPUixJQUFJLEVBQUM7UUE2QjdDTyxvQ0FnQkFBLHlDQUlBQSx1Q0FJQUEsbUNBSUFBO0lBL0JYLE1BQU1HLFVBQVU7UUFDZDtZQUNFQyxPQUFPO1lBQ1BDLE9BQU9MLENBQUFBLHFDQUFBQSxpQkFBQUEsNEJBQUFBLDRCQUFBQSxLQUFNTSxZQUFZLENBQUNDLEtBQUssQ0FBQyxFQUFFLGNBQTNCUCxnREFBQUEsMEJBQTZCUSxFQUFFLENBQUNaLEtBQUssY0FBckNJLGdEQUFBQSxxQ0FBeUM7UUFDbEQ7UUFDQTtZQUNFSSxPQUFPO1lBQ1BDLHFCQUNFLDhEQUFDSTtnQkFBSUMsV0FBVTswQkFDWlYsQ0FBQUEsaUJBQUFBLDRCQUFBQSw2QkFBQUEsS0FBTU0sWUFBWSxDQUFDQyxLQUFLLENBQUMsRUFBRSxjQUEzQlAsaURBQUFBLDJCQUE2QkgsTUFBTSxrQkFDbEMsOERBQUNmLCtGQUFXQTtvQkFBQzRCLFdBQVU7Ozs7O3lDQUV2Qiw4REFBQzNCLCtGQUFPQTtvQkFBQzJCLFdBQVU7Ozs7Ozs7Ozs7O1FBSTNCO1FBQ0E7WUFDRU4sT0FBTztZQUNQQyxPQUFPTCxDQUFBQSwwQ0FBQUEsaUJBQUFBLDRCQUFBQSw2QkFBQUEsS0FBTU0sWUFBWSxDQUFDQyxLQUFLLENBQUMsRUFBRSxjQUEzQlAsaURBQUFBLDJCQUE2QkYsYUFBYSxjQUExQ0UscURBQUFBLDBDQUE4QztRQUN2RDtRQUNBO1lBQ0VJLE9BQU87WUFDUEMsT0FBT0wsQ0FBQUEsd0NBQUFBLGlCQUFBQSw0QkFBQUEsNkJBQUFBLEtBQU1NLFlBQVksQ0FBQ0MsS0FBSyxDQUFDLEVBQUUsY0FBM0JQLGlEQUFBQSwyQkFBNkJRLEVBQUUsQ0FBQ2QsUUFBUSxjQUF4Q00sbURBQUFBLHdDQUE0QztRQUNyRDtRQUNBO1lBQ0VJLE9BQU87WUFDUEMsT0FBT0wsQ0FBQUEsb0NBQUFBLGlCQUFBQSw0QkFBQUEsNkJBQUFBLEtBQU1NLFlBQVksQ0FBQ0MsS0FBSyxDQUFDLEVBQUUsY0FBM0JQLGlEQUFBQSwyQkFBNkJRLEVBQUUsQ0FBQ2YsSUFBSSxjQUFwQ08sK0NBQUFBLG9DQUF3QztRQUNqRDtRQUNBO1lBQ0VJLE9BQU87WUFDUEMsT0FBT0wsQ0FBQUEsc0NBQUFBLGlCQUFBQSw0QkFBQUEsNkJBQUFBLEtBQU1NLFlBQVksQ0FBQ0MsS0FBSyxDQUFDLEVBQUUsY0FBM0JQLGlEQUFBQSwyQkFBNkJRLEVBQUUsQ0FBQ2IsTUFBTSxjQUF0Q0ssaURBQUFBLHNDQUEwQztRQUNuRDtLQUNEO0lBRUQsTUFBTVcsT0FBT3pCLHdEQUFPQTtRQVNGYztJQVBsQixxQkFDRSw4REFBQ2YscUVBQWFBO1FBQ1oyQixxQkFDRSw4REFBQ0g7WUFBSUMsV0FBVTs7Z0JBQWE7Z0JBQ2Q7Z0JBQ1gsQ0FBQ1IseUJBQ0EsOERBQUNmLGdFQUFRQTtvQkFDUDBCLE1BQU1iLENBQUFBLHFDQUFBQSxpQkFBQUEsNEJBQUFBLDZCQUFBQSxLQUFNTSxZQUFZLENBQUNDLEtBQUssQ0FBQyxFQUFFLGNBQTNCUCxpREFBQUEsMkJBQTZCUSxFQUFFLENBQUNmLElBQUksY0FBcENPLGdEQUFBQSxxQ0FBd0M7b0JBQzlDYyxPQUFPOzs7Ozs7Ozs7Ozs7UUFLZlgsU0FBU0E7UUFDVEQsU0FBU0E7a0JBRVQsNEVBQUNPO1lBQUlDLFdBQVU7OzhCQUNiLDhEQUFDSztvQkFDQ0wsV0FBV00sR0FDVDs4QkFFSDs7Ozs7O2dCQUdBaEIsQ0FBQUEsaUJBQUFBLDRCQUFBQSw2QkFBQUEsS0FBTU0sWUFBWSxDQUFDQyxLQUFLLENBQUMsRUFBRSxjQUEzQlAsaURBQUFBLDJCQUE2QmlCLGdCQUFnQixtQkFDNUMsOERBQUM1QiwwREFBUUE7b0JBQ1BXLElBQUksRUFBRUEsaUJBQUFBLDRCQUFBQSw2QkFBQUEsS0FBTU0sWUFBWSxDQUFDQyxLQUFLLENBQUMsRUFBRSxjQUEzQlAsaURBQUFBLDJCQUE2QmlCLGdCQUFnQjtvQkFDbkRDLGtCQUFrQjVCLDZEQUFXQTtvQkFDN0I2QixPQUFPO3dCQUNMLEdBQUc1QiwrREFBYTt3QkFDaEJ1QixPQUFPO29CQUNUOzs7Ozs7Ozs7Ozs7Ozs7OztBQU1aO0dBeEd3QmY7O1FBQ1BmLHNEQUFTQTtRQUVBSSx3REFBUUE7UUE4RG5CRixvREFBT0E7OztLQWpFRWEiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9fTl9FLy4vc3JjL2FwcC90cmFuc2FjdGlvbnMvW2hhc2hdL3BhZ2UudHN4P2MzYzAiXSwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2UgY2xpZW50XCI7XG5pbXBvcnQgeyBDYXJkIH0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9jYXJkXCI7XG5pbXBvcnQgeyBDaXJjbGVDaGVjaywgQ2lyY2xlWCB9IGZyb20gXCJsdWNpZGUtcmVhY3RcIjtcbmltcG9ydCB7XG4gIFRhYmxlLFxuICBUYWJsZUJvZHksXG4gIFRhYmxlQ2VsbCxcbiAgVGFibGVIZWFkLFxuICBUYWJsZUhlYWRlcixcbiAgVGFibGVSb3csXG59IGZyb20gXCJAL2NvbXBvbmVudHMvdWkvdGFibGVcIjtcblxuaW1wb3J0IHsgdXNlUGFyYW1zLCB1c2VSb3V0ZXIsIHVzZVNlYXJjaFBhcmFtcyB9IGZyb20gXCJuZXh0L25hdmlnYXRpb25cIjtcbmltcG9ydCB7IERldGFpbHNMYXlvdXQgfSBmcm9tIFwiQC9jb21wb25lbnRzL2RldGFpbHMvbGF5b3V0XCI7XG5pbXBvcnQgVHJhbnNhY3Rpb25zVGFibGVSb3csIHtcbiAgVGFibGVJdGVtLFxufSBmcm9tIFwiQC9jb21wb25lbnRzL3RyYW5zYWN0aW9ucy90cmFuc2FjdGlvbnMtdGFibGUtcm93XCI7XG5pbXBvcnQgeyBGb3JtIH0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9mb3JtXCI7XG5pbXBvcnQgeyB1c2VGb3JtIH0gZnJvbSBcInJlYWN0LWhvb2stZm9ybVwiO1xuaW1wb3J0IExpc3QsIHsgTGlzdFByb3BzIH0gZnJvbSBcIkAvY29tcG9uZW50cy9saXN0XCI7XG5pbXBvcnQgeyB1c2VDYWxsYmFjaywgdXNlRWZmZWN0LCB1c2VTdGF0ZSB9IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IGNvbmZpZyBmcm9tIFwiQC9jb25maWdcIjtcbmltcG9ydCBUcnVuY2F0ZSBmcm9tIFwicmVhY3QtdHJ1bmNhdGUtaW5zaWRlL2VzXCI7XG5pbXBvcnQgdXNlUXVlcnkgZnJvbSBcIkAvaG9va3MvdXNlLXF1ZXJ5XCI7XG5pbXBvcnQge1xuICBKc29uVmlldyxcbiAgYWxsRXhwYW5kZWQsXG4gIGRhcmtTdHlsZXMsXG4gIGRlZmF1bHRTdHlsZXMsXG59IGZyb20gXCJyZWFjdC1qc29uLXZpZXctbGl0ZVwiO1xuaW1wb3J0IFwicmVhY3QtanNvbi12aWV3LWxpdGUvZGlzdC9pbmRleC5jc3NcIjtcblxuZXhwb3J0IGludGVyZmFjZSBHZXRUcmFuc2FjdGlvblF1ZXJ5UmVzcG9uc2Uge1xuICB0cmFuc2FjdGlvbnM6IHtcbiAgICB0b3RhbENvdW50OiBzdHJpbmc7XG4gICAgaXRlbXM6IChcbiAgICAgIHwge1xuICAgICAgICAgIHR4OiB7XG4gICAgICAgICAgICBoYXNoOiBzdHJpbmc7XG4gICAgICAgICAgICBzZW5kZXI6IHN0cmluZztcbiAgICAgICAgICAgIG1ldGhvZElkOiBzdHJpbmc7XG4gICAgICAgICAgICBub25jZTogc3RyaW5nO1xuICAgICAgICAgIH07XG4gICAgICAgICAgc3RhdHVzOiBib29sZWFuO1xuICAgICAgICAgIHN0YXR1c01lc3NhZ2U/OiBzdHJpbmc7XG4gICAgICAgICAgc3RhdGVUcmFuc2l0aW9uczoge1xuICAgICAgICAgICAgcGF0aDogc3RyaW5nO1xuICAgICAgICAgICAgZnJvbToge1xuICAgICAgICAgICAgICBpc1NvbWU6IGJvb2xlYW47XG4gICAgICAgICAgICAgIHZhbHVlOiBzdHJpbmc7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdG86IHtcbiAgICAgICAgICAgICAgaXNTb21lOiBib29sZWFuO1xuICAgICAgICAgICAgICB2YWx1ZTogc3RyaW5nO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9W107XG4gICAgICAgIH1cbiAgICAgIHwgdW5kZWZpbmVkXG4gICAgKVtdO1xuICB9O1xufVxuXG5jb25zdCBjb2x1bW5zOiBSZWNvcmQ8a2V5b2YgVGFibGVJdGVtLCBzdHJpbmc+ID0ge1xuICBoYXNoOiBcIkhhc2hcIixcbiAgbWV0aG9kSWQ6IFwiTWV0aG9kIElEXCIsXG4gIHNlbmRlcjogXCJTZW5kZXJcIixcbiAgbm9uY2U6IFwiTm9uY2VcIixcbiAgc3RhdHVzOiBcIlN0YXR1c1wiLFxuICBzdGF0dXNNZXNzYWdlOiBcIlN0YXR1cyBNZXNzYWdlXCIsXG59O1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBCbG9ja0RldGFpbCgpIHtcbiAgY29uc3QgcGFyYW1zID0gdXNlUGFyYW1zPHsgaGFzaDogc3RyaW5nIH0+KCk7XG5cbiAgY29uc3QgW2RhdGEsIGxvYWRpbmddID0gdXNlUXVlcnk8R2V0VHJhbnNhY3Rpb25RdWVyeVJlc3BvbnNlPihge1xuICAgICAgdHJhbnNhY3Rpb25zKHRha2U6IDEsIHNraXA6IDAsIGhhc2g6IFwiJHtwYXJhbXMuaGFzaH1cIil7XG4gICAgICAgIHRvdGFsQ291bnQsXG4gICAgICAgIGl0ZW1zIHtcbiAgICAgICAgICB0eCB7XG4gICAgICAgICAgICBoYXNoLFxuICAgICAgICAgICAgbWV0aG9kSWQsXG4gICAgICAgICAgICBzZW5kZXIsXG4gICAgICAgICAgICBub25jZVxuICAgICAgICAgIH0sXG4gICAgICAgICAgc3RhdHVzLFxuICAgICAgICAgIHN0YXR1c01lc3NhZ2UsXG4gICAgICAgICAgc3RhdGVUcmFuc2l0aW9ucyB7XG4gICAgICAgICAgICBwYXRoLFxuICAgICAgICAgICAgZnJvbSB7XG4gICAgICAgICAgICAgIGlzU29tZSwgXG4gICAgICAgICAgICAgIHZhbHVlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0byB7XG4gICAgICAgICAgICAgIGlzU29tZSxcbiAgICAgICAgICAgICAgdmFsdWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9YCk7XG5cbiAgY29uc3QgZGV0YWlscyA9IFtcbiAgICB7XG4gICAgICBsYWJlbDogXCJOb25jZVwiLFxuICAgICAgdmFsdWU6IGRhdGE/LnRyYW5zYWN0aW9ucy5pdGVtc1swXT8udHgubm9uY2UgPz8gXCLigJRcIixcbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIlN0YXR1c1wiLFxuICAgICAgdmFsdWU6IChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtdC0xXCI+XG4gICAgICAgICAge2RhdGE/LnRyYW5zYWN0aW9ucy5pdGVtc1swXT8uc3RhdHVzID8gKFxuICAgICAgICAgICAgPENpcmNsZUNoZWNrIGNsYXNzTmFtZT1cInctNCBoLTQgdGV4dC1ncmVlbi01MDBcIiAvPlxuICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICA8Q2lyY2xlWCBjbGFzc05hbWU9XCJ3LTQgaC00IHRleHQtcmVkLTUwMFwiIC8+XG4gICAgICAgICAgKX1cbiAgICAgICAgPC9kaXY+XG4gICAgICApLFxuICAgIH0sXG4gICAge1xuICAgICAgbGFiZWw6IFwiU3RhdHVzIG1lc3NhZ2VcIixcbiAgICAgIHZhbHVlOiBkYXRhPy50cmFuc2FjdGlvbnMuaXRlbXNbMF0/LnN0YXR1c01lc3NhZ2UgPz8gXCLigJRcIixcbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIk1ldGhvZCBJRFwiLFxuICAgICAgdmFsdWU6IGRhdGE/LnRyYW5zYWN0aW9ucy5pdGVtc1swXT8udHgubWV0aG9kSWQgPz8gXCLigJRcIixcbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIkhhc2hcIixcbiAgICAgIHZhbHVlOiBkYXRhPy50cmFuc2FjdGlvbnMuaXRlbXNbMF0/LnR4Lmhhc2ggPz8gXCLigJRcIixcbiAgICB9LFxuICAgIHtcbiAgICAgIGxhYmVsOiBcIlNlbmRlclwiLFxuICAgICAgdmFsdWU6IGRhdGE/LnRyYW5zYWN0aW9ucy5pdGVtc1swXT8udHguc2VuZGVyID8/IFwi4oCUXCIsXG4gICAgfSxcbiAgXTtcblxuICBjb25zdCBmb3JtID0gdXNlRm9ybSgpO1xuXG4gIHJldHVybiAoXG4gICAgPERldGFpbHNMYXlvdXRcbiAgICAgIHRpdGxlPXtcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGdhcC00XCI+XG4gICAgICAgICAgVHJhbnNhY3Rpb257XCIgXCJ9XG4gICAgICAgICAgeyFsb2FkaW5nICYmIChcbiAgICAgICAgICAgIDxUcnVuY2F0ZVxuICAgICAgICAgICAgICB0ZXh0PXtkYXRhPy50cmFuc2FjdGlvbnMuaXRlbXNbMF0/LnR4Lmhhc2ggPz8gXCJcIn1cbiAgICAgICAgICAgICAgd2lkdGg9ezUwMH1cbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgKX1cbiAgICAgICAgPC9kaXY+XG4gICAgICB9XG4gICAgICBkZXRhaWxzPXtkZXRhaWxzfVxuICAgICAgbG9hZGluZz17bG9hZGluZ31cbiAgICA+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggdy1mdWxsIGZsZXgtZ3Jvd1wiPlxuICAgICAgICA8aDFcbiAgICAgICAgICBjbGFzc05hbWU9e2NuKFxuICAgICAgICAgICAgXCJzY3JvbGwtbS0yMCB0ZXh0LTR4bCBmb250LWV4dHJhYm9sZCB0cmFja2luZy10aWdodCBsZzp0ZXh0LTV4bFwiXG4gICAgICAgICAgKX1cbiAgICAgICAgPlxuICAgICAgICAgIFN0YXRlIHRyYW5zaXRpb25zXG4gICAgICAgIDwvaDE+XG4gICAgICAgIHtkYXRhPy50cmFuc2FjdGlvbnMuaXRlbXNbMF0/LnN0YXRlVHJhbnNpdGlvbnMgJiYgKFxuICAgICAgICAgIDxKc29uVmlld1xuICAgICAgICAgICAgZGF0YT17ZGF0YT8udHJhbnNhY3Rpb25zLml0ZW1zWzBdPy5zdGF0ZVRyYW5zaXRpb25zfVxuICAgICAgICAgICAgc2hvdWxkRXhwYW5kTm9kZT17YWxsRXhwYW5kZWR9XG4gICAgICAgICAgICBzdHlsZT17e1xuICAgICAgICAgICAgICAuLi5kZWZhdWx0U3R5bGVzLFxuICAgICAgICAgICAgICB3aWR0aDogXCIxMDAlXCIsXG4gICAgICAgICAgICB9fVxuICAgICAgICAgIC8+XG4gICAgICAgICl9XG4gICAgICA8L2Rpdj5cbiAgICA8L0RldGFpbHNMYXlvdXQ+XG4gICk7XG59XG4iXSwibmFtZXMiOlsiQ2lyY2xlQ2hlY2siLCJDaXJjbGVYIiwidXNlUGFyYW1zIiwiRGV0YWlsc0xheW91dCIsInVzZUZvcm0iLCJUcnVuY2F0ZSIsInVzZVF1ZXJ5IiwiSnNvblZpZXciLCJhbGxFeHBhbmRlZCIsImRlZmF1bHRTdHlsZXMiLCJjb2x1bW5zIiwiaGFzaCIsIm1ldGhvZElkIiwic2VuZGVyIiwibm9uY2UiLCJzdGF0dXMiLCJzdGF0dXNNZXNzYWdlIiwiQmxvY2tEZXRhaWwiLCJkYXRhIiwicGFyYW1zIiwibG9hZGluZyIsImRldGFpbHMiLCJsYWJlbCIsInZhbHVlIiwidHJhbnNhY3Rpb25zIiwiaXRlbXMiLCJ0eCIsImRpdiIsImNsYXNzTmFtZSIsImZvcm0iLCJ0aXRsZSIsInRleHQiLCJ3aWR0aCIsImgxIiwiY24iLCJzdGF0ZVRyYW5zaXRpb25zIiwic2hvdWxkRXhwYW5kTm9kZSIsInN0eWxlIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(app-pages-browser)/./src/app/transactions/[hash]/page.tsx\n"));

/***/ })

});