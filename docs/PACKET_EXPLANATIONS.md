# Packet explanations and configuration highlighting

Implemented 2026-10-24. These tools explain simulated decisions made by the student's current configuration; they neither change grading nor save completion by themselves.

## FortiGate policy flow

Choose **Trace packet flow** in a policy lesson. The explanation panel shows:

1. Supplied incoming/outgoing interfaces and the routing scope of this exercise.
2. Enabled/disabled rules in evaluation order, interface/address/service comparisons, and the first matching rule or implicit deny.
3. The student's actual web-filter profile/domain result when filtering occurs.
4. The translation boundary: this policy model does not simulate NAT.

**Show policy row** scrolls to, focuses and highlights that exact policy. Rule comparisons display the student's own object/service values, not a reference solution. Changing the policy/object/filter configuration clears the old explanation. The separate network diagram still provides animated replay; the explanation panel uses static steps and native expandable details.

Domains come from test-packet metadata. No live TLS inspection, network route lookup or connection tracking is implied by the policy view.

## Route, PAN security and NAT explorers

**Explain a packet** is available in the existing static-routing/PAN security/PAN NAT lessons and their newly authored configuration counterparts. Enter your own destination or original zone/application fields and run the lookup.

- Static routing shows containing/non-containing prefixes, longest-prefix preference, administrative distance and every selected equal-cost path. It does not check real next-hop reachability or dynamic routing.
- PAN security shows source/destination-zone and application matching in order, stops at the first match and uses implicit deny if no rule matches. Real App-ID detection, sessions, routing and NAT are outside this teaching model.
- PAN NAT shows original-zone/destination matching, the effective translation or unchanged packet, and explicitly keeps security permission separate. A translated packet is not labelled allowed merely because translation matched.

The explorer reuses the evaluators used for configuration grading. **Show configuration row** targets the actual row, including a wrong row that the simulator selected. Input/configuration changes clear previous results so a trace cannot describe stale settings. Invalid packet/configuration input produces a readable validation message.

## Authored check explanations

After checking an authored configuration lesson, open a requirement under **Why each check passed or failed**. It contains the student's actual field/route/rule decisions, with links to their own rows. Interface/zone field checks and automatic exclusive-zone ownership are also explained. Expected values, private reference rows and reference comparisons are not included in these results. Tested packet inputs can appear in diagnostics; they are teaching context, not expected outcomes.

All controls use the existing light/dark tokens. Row focus is keyboard-accessible; scrolling respects reduced motion. Admin starter/reference tables use distinct DOM row IDs.

Regression coverage includes route preference/non-matches, effective rule selection, unchanged NAT, disabled policies, source/destination/service comparisons and actual web-filter decisions. Browser workflows verify policy/route/NAT highlighting, stale-result clearing, generic field highlighting for all five new families, account recovery and mobile overflow containment.

Palo Alto Security and NAT packet explorers also provide **Network view** using the same themed replay dialog as FortiGate. Enter the original zones and application or destination, then open the view. Security displays the actual allow/deny decision from the current rules. NAT displays translated/unchanged results and explicitly leaves security permission unevaluated. Where the exercise provides no endpoint IPs, the diagram labels endpoints as illustrative. Custom Security and NAT lessons use the same view.
