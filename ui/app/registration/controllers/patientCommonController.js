'use strict';

angular.module('bahmni.registration')
    .controller('PatientCommonController', ['$scope', '$rootScope', '$http', 'patientAttributeService', 'appService', 'spinner', '$location', 'ngDialog', '$window', '$state', 'patientService',
        function ($scope, $rootScope, $http, patientAttributeService, appService, spinner, $location, ngDialog, $window, $state, patientService) {
            var autoCompleteFields = appService.getAppDescriptor().getConfigValue("autoCompleteFields", []);
            var showCasteSameAsLastNameCheckbox = appService.getAppDescriptor().getConfigValue("showCasteSameAsLastNameCheckbox");
            var personAttributes = [];
            var caste;
            var isTransferenceClicked = false;
            var is_transferredClicked = false;
            $scope.deathToggle = false;

            $rootScope.patients;
            $rootScope.countNo;
            $rootScope.visibleData = false;

            $scope.checkDuplicate = function () {
               var patientGivenName = $scope.patient.givenName || '';
               var patientLastName = $scope.patient.familyName || '';
               var gender = $scope.patient.gender || '';
               var birthDate = $scope.patient.birthdate || '';
               if(birthDate != '') {
                birthDate = new Date(birthDate);
                birthDate = convertDate(birthDate);
               }
               var queryParams = patientGivenName+' '+patientLastName;
               

               if( queryParams.length > 0) {
                patientService.searchDuplicatePatients(queryParams,gender,birthDate).then(function(response){
                    console.log(response);
                    $rootScope.patients = response.pageOfResults;
                    $rootScope.visibleData = true;
                    $rootScope.countNo = $scope.patients.length;
                });

               } else {
                $rootScope.visibleData = false;
               }
            };

            var convertDate = function (date) {

                var yyyy = date.getFullYear().toString();
                var mm = (date.getMonth()+1).toString();
                var dd  = date.getDate().toString();

                var mmChars = mm.split('');
                var ddChars = dd.split('');

                return yyyy + '-' + (mmChars[1]?mm:"0"+mmChars[0]) + '-' + (ddChars[1]?dd:"0"+ddChars[0]);
            }

            $scope.extraIdentifiersDisplay = _.map($scope.patient.extraIdentifiers,function(some,index){
                return _.pick(some.identifierType,['name']);
            });
            var removed = _.remove( $scope.extraIdentifiersDisplay, function(item){
              return item.name == "NID (SERVIÇO TARV)";  
            }); 


            $scope.extraIdentifiersDisplay = _.map($scope.extraIdentifiersDisplay, function(some,index){
                some.id = index;
                return some;
            });

            $scope.selectedExtraIdentifiers = [];
 

            $scope.showMiddleName = appService.getAppDescriptor().getConfigValue("showMiddleName");
            $scope.showLastName = appService.getAppDescriptor().getConfigValue("showLastName");
            $scope.isLastNameMandatory = $scope.showLastName && appService.getAppDescriptor().getConfigValue("isLastNameMandatory");
            $scope.showBirthTime = appService.getAppDescriptor().getConfigValue("showBirthTime") != null
                ? appService.getAppDescriptor().getConfigValue("showBirthTime") : true;  // show birth time by default
            $scope.genderCodes = Object.keys($rootScope.genderMap);
            $scope.dobMandatory = appService.getAppDescriptor().getConfigValue("dobMandatory") || false;
            $scope.readOnlyExtraIdentifiers = appService.getAppDescriptor().getConfigValue("readOnlyExtraIdentifiers");
            $scope.showSaveConfirmDialogConfig = appService.getAppDescriptor().getConfigValue("showSaveConfirmDialog");
            $scope.showSaveAndContinueButton = false;

            var dontSaveButtonClicked = false;
            var isHref = false;
            $scope.additionalExtraIdentifiers = new Array();
            $rootScope.allExtraIdentifiers = [];
            var newObj = new Object();
            var tempObj = new Object();

            $scope.checkBirthdateEstimated = function () {
               if($scope.patient.age.years != null || $scope.patient.age.months != null || $scope.patient.age.days != null) {
                $scope.patient.birthdateEstimated = true;
               }
               else {
                $scope.patient.birthdateEstimated = false;
               }
            };

            $scope.createPatientsDropdownEvents = {
                onItemSelect: function(item) {
                              newObj = _.filter($scope.patient.extraIdentifiers, function(obj){
                                if( obj.identifierType.name == item.name){
                                    obj.id = item.id;
                                    return obj;
                                }
                              });
                              $scope.additionalExtraIdentifiers.push(newObj[0]);
                              $rootScope.additionalExtraIdentifiers = $scope.additionalExtraIdentifiers;
                         },

                onItemDeselect: function(item) {
                    var removed = _.remove($rootScope.additionalExtraIdentifiers, function(n){
                        return n.id == item.id;
                    });
                },

                onSelectAll: function () {
                               $scope.additionalExtraIdentifiers = [];
                                tempObj = _.filter($scope.patient.extraIdentifiers, function(obj,index){
                                if( obj.identifierType.name !== "NID (SERVIÇO TARV)"){
                                    obj.id = index-1;
                                    return obj;
                                }
                              });
                               $scope.additionalExtraIdentifiers = tempObj;
                               $rootScope.allExtraIdentifiers = $scope.additionalExtraIdentifiers;
                },

                onDeselectAll: function () {
                    $scope.additionalExtraIdentifiers = [];
                    $rootScope.allExtraIdentifiers = [];
                    $rootScope.additionalExtraIdentifiers = [];
                }
            };

            $rootScope.onHomeNavigate = function (event) {
                if ($scope.showSaveConfirmDialogConfig && $state.current.name != "patient.visit") {
                    event.preventDefault();
                    $scope.targetUrl = event.currentTarget.getAttribute('href');
                    isHref = true;
                    $scope.confirmationPrompt(event);
                }
            };

            var stateChangeListener = $rootScope.$on("$stateChangeStart", function (event, toState, toParams) {
                if ($scope.showSaveConfirmDialogConfig && (toState.url == "/search" || toState.url == "/patient/new")) {
                    $scope.targetUrl = toState.name;
                    isHref = false;
                    $scope.confirmationPrompt(event, toState, toParams);
                }
            });

            $scope.confirmationPrompt = function (event, toState) {
                if (dontSaveButtonClicked === false) {
                    if (event) {
                        event.preventDefault();
                    }
                    ngDialog.openConfirm({template: "../common/ui-helper/views/saveConfirmation.html", scope: $scope});
                }
            };

            $scope.continueWithoutSaving = function () {
                ngDialog.close();
                dontSaveButtonClicked = true;
                if (isHref === true) {
                    $window.open($scope.targetUrl, '_self');
                } else {
                    $state.go($scope.targetUrl);
                }
            };

            $scope.cancelTransition = function () {
                ngDialog.close();
                delete $scope.targetUrl;
            };

            $scope.$on("$destroy", function () {
                stateChangeListener();
            });

            $scope.getDeathConcepts = function () {
                return $http({
                    url: Bahmni.Common.Constants.globalPropertyUrl,
                    method: 'GET',
                    params: {
                        property: 'concept.reasonForDeath'
                    },
                    withCredentials: true,
                    transformResponse: [function (deathConcept) {
                        if (_.isEmpty(deathConcept)) {
                            $scope.deathConceptExists = false;
                        } else {
                            $http.get(Bahmni.Common.Constants.conceptSearchByFullNameUrl, {
                                params: {
                                    name: deathConcept,
                                    v: "custom:(uuid,name,set,setMembers:(uuid,display,name:(uuid,name),retired))"
                                },
                                withCredentials: true
                            }).then(function (results) {
                                $scope.deathConceptExists = !!results.data.results.length;
                                $scope.deathConcepts = results.data.results[0] ? results.data.results[0].setMembers : [];
                                $scope.deathConcepts = filterRetireDeathConcepts($scope.deathConcepts);
                            });
                        }
                    }]
                });
            };
            spinner.forPromise($scope.getDeathConcepts());
            var filterRetireDeathConcepts = function (deathConcepts) {
                return _.filter(deathConcepts, function (concept) {
                    return !concept.retired;
                });
            };

            $scope.isAutoComplete = function (fieldName) {
                return !_.isEmpty(autoCompleteFields) ? autoCompleteFields.indexOf(fieldName) > -1 : false;
            };

            $scope.showCasteSameAsLastName = function () {
                personAttributes = _.map($rootScope.patientConfiguration.attributeTypes, function (attribute) {
                    return attribute.name.toLowerCase();
                });
                var personAttributeHasCaste = personAttributes.indexOf("caste") !== -1;
                caste = personAttributeHasCaste ? $rootScope.patientConfiguration.attributeTypes[personAttributes.indexOf("caste")].name : undefined;
                return showCasteSameAsLastNameCheckbox && personAttributeHasCaste;
            };

            $scope.setCasteAsLastName = function () {
                if ($scope.patient.sameAsLastName) {
                    $scope.patient[caste] = $scope.patient.familyName;
                }
            };

            var showSections = function (sectionsToShow, allSections) {
                _.each(sectionsToShow, function (sectionName) {
                    allSections[sectionName].canShow = true;
                    allSections[sectionName].expand = true;
                });
            };

            var hideSections = function (sectionsToHide, allSections) {
                _.each(sectionsToHide, function (sectionName) {
                    allSections[sectionName].canShow = false;
                });
            };

            var executeRule = function (ruleFunction) {
                var attributesShowOrHideMap = ruleFunction($scope.patient);
                var patientAttributesSections = $rootScope.patientConfiguration.getPatientAttributesSections();
                showSections(attributesShowOrHideMap.show, patientAttributesSections);
                hideSections(attributesShowOrHideMap.hide, patientAttributesSections);
            };

             $scope.clearTransferSection = function (value) {
                $scope.patient.isDead = value;
                if(value === true){
                    $scope.patient.is_transferred = false;
                    $scope.patient.transfer_out_date = null;
                    $scope.patient.transfer_out_reason = null;
                    is_transferredClicked = false;

                }
                
            };

            $scope.selectIsTransferred = function () {
                if($scope.patient.transfer_out_reason || $scope.patient.transfer_out_date) {
                    console.log($scope.patient);
                    $scope.patient.is_transferred = true;
                    is_transferredClicked = !is_transferredClicked;
                   if(is_transferredClicked == true) {
                        $scope.patient.dead = !is_transferredClicked;
                        $scope.patient.causeOfDeath = null;
                        $scope.patient.deathDate = null;

                        $scope.patient['Transferred from another HF'] = !is_transferredClicked;
                        $scope.patient['Transferred out HF name'] = null;
                        $scope.patient['Date of transference'] = null;
                        $scope.patient['Patient stage'] = null;
                   }
               }
            };

            $scope.handleUpdate = function (attribute) {

                if (attribute == 'is_transferred') {
                   is_transferredClicked = !is_transferredClicked;
                   if(is_transferredClicked == true) {
                    $scope.patient.dead = !is_transferredClicked;
                    $scope.patient.causeOfDeath = null;
                    $scope.patient.deathDate = null;

                    $scope.patient['Transferred from another HF'] = !is_transferredClicked;
                    $scope.patient['Transferred out HF name'] = null;
                    $scope.patient['Date of transference'] = null;
                    $scope.patient['Patient stage'] = null;
                   }
                   
                }

                
                if (attribute == 'Transferred from another HF') {
                    isTransferenceClicked = !isTransferenceClicked;
                    if ( isTransferenceClicked == true ) {
                        $scope.patient.is_transferred = false;
                        $scope.patient.transfer_out_date = null;
                        $scope.patient.transfer_out_reason = null;
                        isTransferenceClicked = false;
                    }
                    
                }
                var ruleFunction = Bahmni.Registration.AttributesConditions.rules && Bahmni.Registration.AttributesConditions.rules[attribute];
                if (ruleFunction) {
                    executeRule(ruleFunction);
                }
            };

            var executeShowOrHideRules = function () {
                _.each(Bahmni.Registration.AttributesConditions.rules, function (rule) {
                    executeRule(rule);
                });
            };

            $scope.$watch('patientLoaded', function () {
                if ($scope.patientLoaded) {
                    executeShowOrHideRules();
                }
            });

            $scope.getAutoCompleteList = function (attributeName, query, type) {
                return patientAttributeService.search(attributeName, query, type);
            };

            $scope.getDataResults = function (data) {
                return data.results;
            };

            $scope.$watch('patient.familyName', function () {
                if ($scope.patient.sameAsLastName) {
                    $scope.patient[caste] = $scope.patient.familyName;
                }
            });

            $scope.$watch('patient.caste', function () {
                if ($scope.patient.sameAsLastName && ($scope.patient.familyName !== $scope.patient[caste])) {
                    $scope.patient.sameAsLastName = false;
                }
            });

            $scope.selectIsDead = function () {
                if ($scope.patient.causeOfDeath || $scope.patient.deathDate) {
                    $scope.patient.dead = true;
                    $scope.patient.is_transferred = false;
                    $scope.patient.transfer_out_date = null;
                    $scope.patient.transfer_out_reason = null;
                    is_transferredClicked = false;
                }
            };

            $scope.disableIsTransferred = function () {
                return $scope.patient.transfer_out_reason;
            };

            $scope.disableIsDead = function () {
                return ($scope.patient.causeOfDeath || $scope.patient.deathDate) && $scope.patient.dead;
            };
        }]);
