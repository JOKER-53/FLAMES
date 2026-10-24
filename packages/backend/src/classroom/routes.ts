import { Router } from "express";
import { ContentStore, ContentError } from "../content/store";
import { PlatformStore } from "../platform/store";
import { requestUser } from "../platform/auth";
import { academyRequest, AcademyError } from "../integration/academy";
import { assignmentModules } from "./modules";
import { ClassroomStore, assignmentStatus } from "./store";
export function classroomRouter(groups: ClassroomStore, accounts: PlatformStore, content: ContentStore, academy: boolean) {
  const router=Router();
  router.use((req,res,next)=>{const user=academy?res.locals.academyUser:requestUser(req,accounts);if(!user){res.status(401).json({error:"Sign in to access assignments."});return;}res.locals.classUser=user;next();});
  router.get("/",async(req,res,next)=>{
    try {
      const user=res.locals.classUser; const list=groups.groups(user);
      const ids=user.role==="instructor"?[...new Set<string>(list.flatMap(group=>group.members.map(member=>member.id)))]:[user.id];
      let progress: Record<string, {fortigate:string[];paloalto:string[]}> = {};
      if(academy && ids.length){
        if(user.role==="instructor") {
          for (let index=0;index<ids.length;index+=500) {
            const data=await academyRequest(req,"/integrations/fortisim/classroom/progress",{userIds:ids.slice(index,index+500)});
            if(!data.progress || typeof data.progress!=="object") throw new AcademyError(502,"Academy returned invalid classroom progress.");
            for (const id of ids.slice(index,index+500)) {
              if(!Array.isArray(data.progress[id]?.fortigate) || !Array.isArray(data.progress[id]?.paloalto)) throw new AcademyError(502,"Academy returned invalid student progress.");
              progress[id]=data.progress[id];
            }
          }
        } else {
          const [fg,pan]=await Promise.all([academyRequest(req,"/integrations/fortisim/progress/fortigate"),academyRequest(req,"/integrations/fortisim/progress/paloalto")]);
          if(!Array.isArray(fg.completed)||!Array.isArray(pan.completed)) throw new AcademyError(502,"Academy returned invalid progress.");
          progress[user.id]={fortigate:fg.completed,paloalto:pan.completed};
        }
      } else for(const id of ids) progress[id]={fortigate:accounts.progress(id,"fortigate"),paloalto:accounts.progress(id,"paloalto")};
      res.json({groups:list.map(group=>({...group,assignments:group.assignments.map(assignment=>({...assignment,results:(user.role==="instructor"?group.members:[user]).map(member=>({userId:member.id,name:member.name,...assignmentStatus(assignment,progress[member.id]?.[assignment.vendor as "fortigate"|"paloalto"]??[],groups.started(assignment.id,member.id))}))}))})), modules:user.role==="instructor"?assignmentModules(content):[],provenance:academy?"Academy-owned student-reported practice progress":"Student-reported practice progress; not certified assessment evidence"});
    } catch(error){next(error);}
  });
  router.post("/join",(req,res,next)=>{try{if(res.locals.classUser.role!=="student")throw new ContentError(403,"Student access required to join a group.");groups.join(res.locals.classUser,req.body?.code);res.json({ok:true});}catch(error){next(error);}});
  router.post("/assignments/:id/start",(req,res,next)=>{try{groups.start(req.params.id,res.locals.classUser.id);res.json({ok:true});}catch(error){next(error);}});
  router.use((req,res,next)=>{if(res.locals.classUser.role!=="instructor"){res.status(403).json({error:"Instructor access required."});return;}next();});
  router.post("/groups",(req,res,next)=>{try{res.status(201).json({id:groups.create(res.locals.classUser,req.body?.name)});}catch(error){next(error);}});
  router.post("/groups/:id/delete",(req,res,next)=>{try{groups.deleteGroup(req.params.id,res.locals.classUser.id);res.json({ok:true});}catch(error){next(error);}});
  router.post("/groups/:id/assignments/:assignmentId/delete",(req,res,next)=>{try{groups.deleteAssignment(req.params.id,res.locals.classUser.id,req.params.assignmentId);res.json({ok:true});}catch(error){next(error);}});
  router.post("/groups/:id/rotate-invite",(req,res,next)=>{try{groups.rotate(req.params.id,res.locals.classUser.id);res.json({ok:true});}catch(error){next(error);}});
  router.post("/groups/:id/remove-member",(req,res,next)=>{try{if(typeof req.body?.userId!=="string")throw new ContentError(400,"Member ID required.");groups.remove(req.params.id,res.locals.classUser.id,req.body.userId);res.json({ok:true});}catch(error){next(error);}});
  router.post("/groups/:id/assignments",(req,res,next)=>{try{const module=assignmentModules(content).find(module=>module.id===req.body?.moduleId&&module.vendor===req.body?.vendor);if(!module)throw new ContentError(400,"Choose an available module.");res.status(201).json({id:groups.assign(req.params.id,res.locals.classUser,req.body,module)});}catch(error){next(error);}});
  return router;
}
