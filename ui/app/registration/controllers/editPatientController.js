'use strict';

angular.module('bahmni.registration')
    .controller('EditPatientController', ['$scope', 'patientService', 'encounterService', '$stateParams', 'openmrsPatientMapper',
        '$window', '$q', 'spinner', 'appService', 'messagingService', '$rootScope', 'auditLogService', 'patient', '$state',
        function ($scope, patientService, encounterService, $stateParams, openmrsPatientMapper, $window, $q, spinner,
                  appService, messagingService, $rootScope, auditLogService, patient, $state) {
            var dateUtil = Bahmni.Common.Util.DateUtil;
            var uuid = $stateParams.patientUuid;
            var configValueForEnterId = appService.getAppDescriptor().getConfigValue('showEnterID');
            $scope.showEnterID = configValueForEnterId === null ? true : configValueForEnterId;
            $scope.patient = {};
            $scope.actions = {};
            $scope.addressHierarchyConfigs = appService.getAppDescriptor().getConfigValue("addressHierarchy");
            $scope.disablePhotoCapture = appService.getAppDescriptor().getConfigValue("disablePhotoCapture");
            $scope.today = dateUtil.getDateWithoutTime(dateUtil.now());
            var editExtraIdentifiers = [];
            $scope.dropdownIdentifiers = [];
            $scope.editSelectedExtraIdentifiers = [];
            var isSwitch = true;
            var toRemoveArray = [];
            var extraIdentifiersSelectAll = [];

            $scope.$watch('patient.extraIdentifiers', function(newValue, oldValue,scope) {
                if( newValue != oldValue ) {
                $scope.dropdownIdentifiers = angular.copy(newValue);
                var removed = _.remove( $scope.dropdownIdentifiers, function(currentObj) {
                    return currentObj.hasOwnProperty("identifier");
                });

                
                _.map(removed, function(currentObj){
                    toRemoveArray.push(currentObj.identifierType.name);
                });



               editExtraIdentifiers = editExtraIdentifiers.filter( function (currentObj) {
                    return toRemoveArray.indexOf(currentObj.identifierType.name) < 0;
               });

               $scope.dropdownIdentifiers = editExtraIdentifiers;
                $scope.dropdownIdentifiers = _.map($scope.dropdownIdentifiers,function(some,index){
                    return _.pick(some.identifierType,['name']);
                });
                $scope.dropdownIdentifiers = _.map($scope.dropdownIdentifiers, function(some,index){
                    some.id = index;
                    return some;
                });

                if(isSwitch) {
                    var originalRemove = _.remove($scope.patient.extraIdentifiers , function(currentObj) {
                    return !currentObj.hasOwnProperty("identifier");
                });
                }
                

            }
            });
            $scope.editPatientsAdditionalExtraIdentifiers = new Array();
            $rootScope.allExtraIdentifiers = [];
            var newObj = new Object();
            var tempObj = new Array();

            $scope.editPatientsDropdownEvents = {
                onItemSelect: function(item) {
                              newObj = _.filter(editExtraIdentifiers, function(obj){
                                if( obj.identifierType.name == item.name){
                                    obj.id = item.id;
                                    return obj;
                                }
                              });
                              $scope.editPatientsAdditionalExtraIdentifiers.push(newObj[0]);
                         },

                onItemDeselect: function(item) {
                    var removed = _.remove($scope.editPatientsAdditionalExtraIdentifiers, function(n){
                        return n.id == item.id;
                    });
                },

                onSelectAll: function () {
                               $scope.editPatientsAdditionalExtraIdentifiers = [];
                               var copyExtraIdentifiersSelectAll = angular.copy(extraIdentifiersSelectAll);
                              copyExtraIdentifiersSelectAll = copyExtraIdentifiersSelectAll.filter( function (currentObj, index) {
                                    return toRemoveArray.indexOf(currentObj.identifierType.name) < 0;
                                });

                              copyExtraIdentifiersSelectAll = _.map(copyExtraIdentifiersSelectAll, function(currentObj,index) {
                                currentObj.id = index;
                                return currentObj;
                              });
                               $scope.editPatientsAdditionalExtraIdentifiers = copyExtraIdentifiersSelectAll;
                               
                },

                onDeselectAll: function () {
                    $scope.editPatientsAdditionalExtraIdentifiers = [];
                }
            };

            var setReadOnlyFields = function () {
                $scope.readOnlyFields = {};
                var readOnlyFields = appService.getAppDescriptor().getConfigValue("readOnlyFields");
                angular.forEach(readOnlyFields, function (readOnlyField) {
                    if ($scope.patient[readOnlyField]) {
                        $scope.readOnlyFields[readOnlyField] = true;
                    }
                });
            };

            var successCallBack = function (openmrsPatient) {
                $scope.openMRSPatient = openmrsPatient["patient"];
                $scope.patient = openmrsPatientMapper.map(openmrsPatient);
                $scope.shouldShowDeathConcepts = !$scope.patient.is_transferred;
                $scope.shouldShowTransferSection = !$scope.patient.isDead && !$scope.patient['Transferred from another HF'];
                $scope.shouldShowTransferenceSection = true;
                setReadOnlyFields();
                expandDataFilledSections();
                $scope.patientLoaded = true;
            };

            var expandDataFilledSections = function () {
                angular.forEach($rootScope.patientConfiguration && $rootScope.patientConfiguration.getPatientAttributesSections(), function (section) {
                    var notNullAttribute = _.find(section && section.attributes, function (attribute) {
                        return $scope.patient[attribute.name] !== undefined;
                    });
                    section.expand = section.expanded || (notNullAttribute ? true : false);
                });
            };

            (function () {
                var getPatientPromise = patientService.get(uuid).then(successCallBack);
                var editPatientData = patient.create();
                editExtraIdentifiers = editPatientData.extraIdentifiers;
                extraIdentifiersSelectAll = angular.copy(editExtraIdentifiers);
                var isDigitized = encounterService.getDigitized(uuid);
                isDigitized.then(function (data) {
                    var encountersWithObservations = data.data.results.filter(function (encounter) {
                        return encounter.obs.length > 0;
                    });
                    $scope.isDigitized = encountersWithObservations.length > 0;
                });

                spinner.forPromise($q.all([getPatientPromise, isDigitized]));
            })();

            $scope.update = function () {
                isSwitch = false;
                $scope.patient.extraIdentifiers = $scope.patient.extraIdentifiers.concat($scope.editPatientsAdditionalExtraIdentifiers); 
                addNewRelationships();
                var errorMessages = Bahmni.Common.Util.ValidationUtil.validate($scope.patient, $scope.patientConfiguration.attributeTypes);
                if (errorMessages.length > 0) {
                    errorMessages.forEach(function (errorMessage) {
                        messagingService.showMessage('error', errorMessage);
                    });
                    return $q.when({});
                }
                return spinner.forPromise(patientService.update($scope.patient, $scope.openMRSPatient).then(function (result) {
                    var patientProfileData = result.data;
                    if (!patientProfileData.error) {
                        successCallBack(patientProfileData);
                        $scope.actions.followUpAction(patientProfileData);
                    }
                    $scope.editPatientsAdditionalExtraIdentifiers = [];
                    $scope.dropdownIdentifiers = [];

                    $state.transitionTo($state.current, $stateParams, {
                        reload: true,
                        inherit: false,
                        notify: true
                    });

                }));
            };

            var addNewRelationships = function () {
                var newRelationships = _.filter($scope.patient.newlyAddedRelationships, function (relationship) {
                    return relationship.relationshipType && relationship.relationshipType.uuid;
                });
                newRelationships = _.each(newRelationships, function (relationship) {
                    delete relationship.patientIdentifier;
                    delete relationship.content;
                    delete relationship.providerName;
                });
                $scope.patient.relationships = _.concat(newRelationships, $scope.patient.deletedRelationships);
            };

            $scope.isReadOnly = function (field) {
                return $scope.readOnlyFields ? ($scope.readOnlyFields[field] ? true : false) : undefined;
            };

            $scope.afterSave = function () {
                auditLogService.log($scope.patient.uuid, Bahmni.Registration.StateNameEvenTypeMap['patient.edit'], undefined, "MODULE_LABEL_REGISTRATION_KEY");
                messagingService.showMessage("info", "REGISTRATION_LABEL_SAVED");
            };
        }]);